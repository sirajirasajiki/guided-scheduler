# Claude Codeに丸投げしてみた – 本番DB/開発DB分離編

こんにちは、白々さじきです。

飲み会の日程調整ツールをCloudflare Workers + Hono + D1で作るこの検証プロジェクトも、少しずつ形になってきました。今回は「本番DBと開発DBの分離」という地味だけど大事なインフラ整備をClaude Codeに丸投げした話です。

---

## なぜDB分離が必要だったか

最初の実装フェーズでは、本番DBと開発DBをまったく分けていませんでした。`wrangler dev`でローカル開発するときも、デプロイするときも、すべて同じD1データベース（`guided-scheduler`）に接続していました。

これが問題になる理由は2つあります。

**理由1：Claude Codeが本番データに誤って触れるリスク**

Claude Codeはマイグレーションの適用や動作確認のために`wrangler d1`コマンドを叩くことがあります。もし`--remote`フラグ付きのコマンドを実行されると、本番D1に直接アクセスしてしまいます。テスト用のレコードが混入したり、最悪の場合データが消えたりするリスクがあります。

**理由2：今後追加予定のGitHub Actionsとの兼ね合い**

古いイベントを自動で削除する月次クリーンアップのGitHub Actionsを追加する予定があります。このActions経由のDB操作も本番DBを対象にする予定なので、開発中に誤爆しないよう、事前に分離しておく必要がありました。

**教訓：AIに触らせる前に「触らせてはいけない場所」を環境レベルで分離しておく。コードやCLAUDE.mdの注意書きだけでは不十分で、物理的に触れない構成にするのが確実。**

## どんな構成にしたか

wrangler.tomlの`env`機能を使って、2つの名前付き環境を定義しました。

```toml
# 開発環境
[env.dev]
name = "guided-scheduler-dev"
[[env.dev.d1_databases]]
binding = "DB"
database_name = "guided-scheduler-dev"
database_id = "ここにID"

# 本番環境
[env.production]
name = "guided-scheduler"
[[env.production.d1_databases]]
binding = "DB"
database_name = "guided-scheduler"
database_id = "ここにID"
```

コマンドもこう分けました。

| コマンド           | 接続DB               | デプロイ先Worker                          |
| ------------------ | -------------------- | ----------------------------------------- |
| `pnpm dev`         | guided-scheduler-dev | ローカル                                  |
| `pnpm deploy:dev`  | guided-scheduler-dev | guided-scheduler-dev.sirajira.workers.dev |
| `pnpm deploy:prod` | guided-scheduler     | guided-scheduler.sirajira.workers.dev     |

ここで一つ気づいたのが、**Workerも分離しないと意味がない**ということです。最初の設計案では、DBだけ分けてWorkerは同じ（`guided-scheduler`）にしようとしていました。しかしそれだと、`pnpm deploy`（開発用）を実行しても本番Workerが上書きされてしまいます。envごとに`name`を明示してWorkerも別名にすることで、デプロイ先の誤爆を防ぎました。

**教訓：DBを分けるだけでなく、Workerも分けないとデプロイ時の誤爆リスクが残る。`[env.xxx]`に`name`を必ず明示すること。**

## Claude Codeへの指示内容

今回の指示はStep形式でまとめて一括で渡しました。実際に渡したプロンプトはこちらです。

```
## 目的
本番DBと開発DBを分離し、Claude Codeや開発作業が
本番データに誤って触れないようにする。

## Step 1: 開発用D1データベースを新規作成
以下のコマンドで開発用DBを作成し、database_idを控える:
npx wrangler d1 create guided-scheduler-dev

## Step 2: wrangler.tomlを修正
現在の設定を「本番用」として残しつつ、
開発用の設定をデフォルトに変更する。

【変更後のwrangler.toml構成】
# デフォルト = 開発用DB
[[d1_databases]]
binding = "DB"
database_name = "guided-scheduler-dev"
database_id = "<Step1で作成したID>"

# 本番環境
[env.production]
[[env.production.d1_databases]]
binding = "DB"
database_name = "guided-scheduler"
database_id = "<既存の本番DBのID>"

## Step 3: 開発用DBにマイグレーションを適用
npx wrangler d1 migrations apply guided-scheduler-dev --remote

## Step 4: 本番デプロイコマンドをREADMEに追記
## Step 5: CLAUDE.mdにDB操作ルールを追記

## 禁止事項
- 既存の本番DBのデータ削除・変更
- wrangler.tomlとCLAUDE.mdとREADME以外のファイルの変更
```

指示文書には「禁止事項」として「既存の本番DBのデータ削除・変更」と「変更してよいファイルの明示（wrangler.toml / CLAUDE.md / README.mdのみ）」を記載しました。Claudeが余計なファイルに手を出さないよう、スコープを絞るのが大事です。

Step 3の`--remote`フラグについて、Claudeは実行前に自ら止まって「これは何をするコマンドか」という状態になりました。私が「意味を教えて」と確認したところ、丁寧に解説してくれました。完全委任でも、コマンドの意味を人間が把握しておく習慣は手放してはいけないと感じます。

**教訓：指示文書には「やること」だけでなく「やってはいけないこと」と「触ってよいファイル」を明記する。スコープを絞ることでClaudeの予期しない変更リスクが下がる。**

## 実際にやらせてみてどうだったか

Step 1〜5は概ねスムーズに動きました。実際に実行したコマンドはこの2本です。

```bash
# 開発用DB作成
npx wrangler d1 create guided-scheduler-dev

# 開発用DBにマイグレーション適用
npx wrangler d1 migrations apply guided-scheduler-dev --remote
```

`wrangler d1 create`でDBを作成し、tomlを書き換え、5件のマイグレーションを一括適用するところまで、大きなつまずきはありませんでした。

一点具体的に書けることがあります。`pnpm deploy:dev`を実行したところ、以下のワーニングが出ました。

```
[WARNING] Multiple environments are defined in the Wrangler configuration file,
but no target environment was specified for the deploy command.
```

複数のenvが定義されているのに`--env`を指定していないため出た警告です。動作自体は問題ありませんでしたが、「気持ち悪い」ということで明示化することになりました。

デフォルトの`[[d1_databases]]`を廃止して`[env.dev]`に昇格させ、すべてのコマンドに`--env dev`または`--env production`を明示するよう修正しました。Claudeはこの追加修正にも対応してくれましたが、最初の設計時にこのワーニングを予見できなかったのは反省点です。

**教訓：ワーニングは必ず潰す。「動いているから無視」は後の混乱の種になる。Wranglerのenv分離では`--env`の明示が必須。**

修正後、両DBに正しくテーブルが作られているかを以下のコマンドで確認しました。

```bash
# Dev DBのテーブル確認
npx wrangler d1 execute guided-scheduler-dev --remote \
  --command "SELECT name FROM sqlite_schema WHERE type='table';"

# Prod DBのテーブル確認
npx wrangler d1 execute guided-scheduler --remote \
  --command "SELECT name FROM sqlite_schema WHERE type='table';"
```

<!-- TODO: 両DBの出力結果のスクショを追加 -->

ただし、ここで終わりではありませんでした。`pnpm deploy:dev`を実行した後、「deploy先って開発環境と本番環境で同じ？」という疑問が出てきました。

確認してみると、最初の指示では**DBは分離できていたものの、Workerは同一**のままになっていました。つまり`pnpm deploy`（開発用）を実行しても、本番Worker（`guided-scheduler`）が上書きされる状態が残っていました。

これを受けて追加で以下の修正を指示しました。

1. `[env.production]`に`name = "guided-scheduler"`を追加してWorkerを明示分離
2. デフォルトの`name`を`guided-scheduler-dev`に変更
3. `package.json`に`deploy:dev` / `deploy:prod`スクリプトを追加

さらにWARNING対応で`[env.dev]`の明示化と`--env dev`フラグの付与まで、計3回の追加修正が発生しました。

初回の指示にWorker分離とコマンド設計まで含めておけば、1回のやり取りで完結できた部分です。「DBを分けたい」という要件だけを渡すと、Claudeは言われた通りDBだけを分けます。その先にある「Workerも分離しないと意味がない」「コマンドも整備しないと人間が迷う」という設計判断は、人間が先に考えて指示に含める必要がありました。

改めて感じたのは、**環境を追加・分離するときは影響範囲を事前に洗い出す習慣が必要だ**ということです。「DBを分ける」という一点だけを見ると変更箇所は少なく見えますが、実際にはDB定義・Worker名・デプロイコマンド・スクリプト・ドキュメントと、連鎖的に変更が必要な箇所が広がります。この影響範囲を人間が先に把握してから指示を出さないと、Claudeに何度も追加修正を依頼することになります。今回がまさにその典型でした。

## 学びと全体の感想

今回一番感じたのは、**環境を分離するときは「何が変わるか」を先に全部洗い出す必要がある**ということです。

「DBを分けたい」という要件自体はClaudeへの一言指示でも実行できます。ただ今回実際にやってみると、DB定義だけでなくWorker名・デプロイコマンド・スクリプト・ドキュメントと、連鎖的に変更が必要な箇所が広がりました。その影響範囲を把握しないまま指示を出したことで、計3回の追加修正が発生しました。

Claudeは指示されたことを正確にやりますが、「DBを分けるならWorkerも分けないと意味がない」という一段深い設計判断は自分からは言ってくれません。人間が影響範囲を先に整理してから指示を出す、という順序が大事だと改めて感じました。

エンジニアの現場でも、「環境分離は後でやる」「まず動くものを」という判断が積み重なって、本番事故につながるケースは多いと思います。Claude Code完全委任でも同じで、コードを書く前に影響範囲を人間がきちんと整理することの重要性を実感しました。完全委任の「完全」は、考えることまで委任するという意味ではないと、改めて実感しています。

## 次にやること

- GitHub Actionsによる月次クリーンアップ実装（開発DB・本番DBそれぞれに対応）
- `pnpm db:migrate`系コマンドも`guided-scheduler-dev`対応に更新
