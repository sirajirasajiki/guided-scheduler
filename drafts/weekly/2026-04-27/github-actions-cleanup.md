# Claude Codeに丸投げしてみた – GitHub Actions月次クリーンアップ編

こんにちは、白々さじきです。

飲み会の日程調整ツールをCloudflare Workers + Hono + D1で作るこの検証プロジェクト。今回はDB分離に続く運用インフラ整備として「古いイベントを毎月自動削除するGitHub Actions」をClaude Codeに丸投げした話です。

今回はもう一つ検証したいことがありました。**GitHubイシューをそのままプロンプトとして渡せるか**という点です。

---

## GitHubイシューをプロンプトとして渡してみた

これまでの実装では、やりたいことをテキストで直接Claude Codeに渡していました。今回は「GitHubイシューのURLを渡すだけで実装してもらえるか」を試してみました。

実際に渡したプロンプトはこれだけです。

```
下記のIssueを実行してください。
https://github.com/sirajirasajiki/guided-scheduler/issues/2
```

イシューの中身はこうです。

```
タイトル: GitHub Actionsで月次データクリーンアップを実装する

- 候補日の最大日から30日以上経過したイベントを毎月1日3時(JST)に自動削除する
- 対象は本番DB（guided-scheduler, --env production）のみ
- workflow_dispatch で手動実行も可能にする
- 削除件数をログに出力する

完了条件:
- .github/workflows/cleanup-old-events.yml が作成されている
- cronスケジュール: 毎月1日 2:00 JST
- 子テーブルのレコードを先に削除する（外部キー制約を考慮）
- GitHub Secrets: CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID を設定する
```

結果として、Claude CodeはイシューのURLからページを取得し、要件を読み取ったうえで実装まで完了しました。`.github/workflows/cleanup-old-events.yml` の作成、SQL設計、外部キー制約を考慮した削除順序の決定、すべてイシューの内容から判断しています。

**「GitHubイシューをそのまま渡す」は普通に機能する。** 要件が整理されていれば、URL1行で実装まで完結します。逆に言うと、イシューの書き方が実装品質に直結します。今回のイシューには完了条件まで明記していたので、手戻りなく一発で実装が完了しました。

**教訓：Claude Codeへの指示はテキストでなくてもよい。整理されたGitHubイシューのURLを渡すだけで実装できる。発注スキルの本質は「何を書くか」であって「どこに書くか」ではない。**

---

## なぜ月次クリーンアップが必要か

このツールには認証機能がありません。URLを知っている人なら誰でもイベントを作れます。放置すると古いデータが積み上がり続けるため、「候補日の最終日から30日以上経過したイベントを毎月1日に自動削除する」仕組みが欲しくなりました。

手動で定期的に削除するのは運用として続かないので、GitHub Actionsのcronを使って自動化することにしました。

---

## 作ったもの

`.github/workflows/cleanup-old-events.yml` を作成し、以下を実現しました。

- 毎月1日 18:00 UTC（≒ 2日 3:00 JST）に自動実行
- `workflow_dispatch` で手動実行も可能
- `dry_run: true` オプションで削除せず対象件数だけ確認できる
- 削除順序は `participants` → `events`（外部キー制約を考慮）

削除対象の判定はSQLite の `json_each` を使って `candidate_dates`（JSON配列）の最大値を取り出しています。

```sql
SELECT e.id FROM events e, json_each(e.candidate_dates) AS dates
GROUP BY e.id
HAVING MAX(dates.value) < date('now', '-30 days')
```

DBへのアクセスは `wrangler d1 execute guided-scheduler --remote` 経由です。GitHub ActionsのランナーからCloudflare D1に直接SQLを投げる構成になっています。

---

## dry_runオプションの設計

「本番DBに対して動かす前に確認したい」という需要は確実にあります。そこでワークフローに `dry_run` 入力を追加しました。

```yaml
workflow_dispatch:
  inputs:
    dry_run:
      description: 'dry_run: true にすると削除せず対象件数の確認のみ行う'
      type: choice
      options:
        - 'false'
        - 'true'
```

`dry_run: true` のときは「Count deletion targets」ステップで対象イベントの一覧を出力し、削除ステップをスキップします。本番実行前にまずこれで確認する運用にしています。

<!-- ここに写真：GitHub ActionsのRun workflowボタン、dry_run選択画面 -->

---

## GitHub Secretsの設定

ワークフローからCloudflareにアクセスするために2つのSecretが必要です。

- `CLOUDFLARE_API_TOKEN`：Cloudflare APIトークン
- `CLOUDFLARE_ACCOUNT_ID`：CloudflareのアカウントID

設定場所：GitHub リポジトリ → Settings → Secrets and variables → Actions → **Secretsタブ** → New repository secret

<!-- ここに写真：GitHub Secrets設定画面 -->

**SecretsとVariablesの違い：**

| | Secrets | Variables |
| --- | --- | --- |
| ログへの表示 | `***` でマスクされる | そのまま表示される |
| 設定後の値 | 読み返し不可 | 読み返し可能 |
| 用途 | APIトークン等の機密情報 | 環境名、フラグ等 |

APIトークンは機密情報なのでSecrets一択です。

---

## Cloudflare APIトークンの作成

Cloudflare ダッシュボード → My Profile → API Tokens → Create Token

テンプレートは使わず **Create Custom Token** を選びます。

<!-- ここに写真：Cloudflare API Token作成画面（テンプレート一覧） -->

必要な権限は以下の2つです。

| スコープ | リソース | 権限 |
| --- | --- | --- |
| Account | D1 | Edit |
| User | User Details | Read |

<!-- ここに写真：Custom Token権限設定画面 -->

Account Resources は「自分のアカウントのみ」に絞るとより安全です。

---

## つまずいたこと3連発

### ① APIトークンの権限が足りなかった

最初は `Account > D1 > Edit` だけ設定して実行したところ、こんなエラーが出ました。

```
Authentication error [code: 10000]
Getting User settings...
Unable to retrieve email for this user.
Are you missing the `User->User Details->Read` permission?
```

`User > User Details > Read` が不足していました。エラーメッセージにそのまま書いてあるのに最初は見落としていました。

**教訓：wranglerのエラーメッセージはちゃんと読む。権限不足の場合は不足している権限名まで書いてある。**

### ② CLOUDFLARE_ACCOUNT_IDに間違った値を入れた

権限を追加してもまだ同じエラーが出続けました。原因を探ると `CLOUDFLARE_ACCOUNT_ID` に間違った値が入っていました。

トークン作成後に出てきたCurlコマンドを実行しその時に出てきたIDの値がアカウントIDと勘違いしていました。

**正しい取得場所：**

| 値 | 取得場所 |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | My Profile → API Tokens → トークン作成後の画面 |
| `CLOUDFLARE_ACCOUNT_ID` | Workers & Pages の右サイドバー |

<!-- ここに写真：Cloudflare Workers & PagesのAccount ID表示箇所 -->

**教訓：CLOUDFLARE_ACCOUNT_IDはトークン画面ではなくWorkers & Pagesのサイドバーから取得する。画面に複数のIDが出てくるので混乱しやすい。**

### ③ WindowsでのNode.jsワーニング

Actions実行時にこんなワーニングが出ました。

```
Node.js 20 actions are deprecated.
actions/checkout@v4, actions/setup-node@v4, pnpm/action-setup@v4 are running on Node.js 20.
```

ワークフローのenv に `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` を追加し、setup-nodeのバージョンも `'24'` に変更して対応しました。

残ったワーニング：

```
Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24.
```

これは「アクションのコード自体は20向けだが、強制的に24で実行している」という情報提供です。実際には24で動いており、動作への影響はありません。各アクションの管理者がNode.js 24対応バージョンをリリースするまでは消せません。

**教訓：FORCE_JAVASCRIPT_ACTIONS_TO_NODE24で対応できるが、残るワーニングはaction側の対応待ち。動作には問題ない。**

---

## ローカルでのDB確認コマンド

DB確認用のコマンドも整備しました。

```bash
pnpm db:events:dev   # 開発DB のイベント一覧
pnpm db:events:prod  # 本番DB のイベント一覧
```

当初 `--local` フラグでローカルSQLiteを直接叩くコマンドを作ったのですが、Windowsではwranglerが内部で起動するworkerdプロセスとlibuv（Node.jsの非同期I/Oライブラリ）が衝突してクラッシュしました。

```
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76
ELIFECYCLE Command failed with exit code 3221226505.
```

開発DBもCloudflareのリモートD1として運用しているため、`--remote` でリモートに接続する方式に変更しました。

**教訓：Windows環境でwrangler d1 execute --localは動かない場合がある。開発DBもリモートD1として持つ構成にすると --remote で統一できて問題が起きない。**

---

## GitHub ActionsのCronは次回実行が見えない

設定後に「次回いつ動くか確認したい」と思ったのですが、GitHub Actionsには次回実行予定時刻を表示する機能がありません。Cron式から手動で計算するしかないです。

今回の `0 18 1 * *` なら次回は6月1日 18:00 UTC（= 6月2日 3:00 JST）です。

もう一つ注意点があります。**リポジトリへのpushが60日間ないとcronが自動停止**します。停止するとメール通知が届くので、その場合はActionsタブから手動で有効化し直してください。

---

## 学びと全体の感想

今回は実装自体よりも **Cloudflare側の設定とGitHub Secretsの設定でつまずいた** 印象が強いです。コードはClaudeが書いてくれますが、外部サービスの認証・権限周りは人間が理解して設定する必要があります。

特に「どの画面のどのIDを使えばいいか」は、慣れていないと迷います。Cloudflareの場合、アカウントID・データベースID・APIトークンIDがそれぞれ別の画面に存在していて、初見では混乱しやすいです。

**完全委任で詰まるのはコードではなく、外部サービスとの接続部分が多い。**これはClaudeに丸投げできない領域なので、あらかじめ自分で理解しておく必要があります。

## 次にやること

- 6月1日の自動実行を確認する
