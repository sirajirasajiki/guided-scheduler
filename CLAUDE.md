# 幹事ツール - Claude Code 指示書

> 設計・仕様・機能スコープ・データモデルの詳細は [`docs/DESIGN.md`](docs/DESIGN.md) を参照すること。

---

## 命名規則

- ファイル名 : kebab-case (例: `event-form.tsx`)
- コンポーネント : PascalCase
- 関数・変数 : camelCase
- DB テーブル・カラム : snake_case
- API エンドポイント : RESTful
  - `POST   /api/events` : イベント作成
  - `GET    /api/events/admin/:adminToken` : 管理用取得
  - `GET    /api/events/share/:shareToken` : 共有用取得
  - `POST   /api/events/share/:shareToken/participants` : 回答送信
  - `PATCH  /api/events/admin/:adminToken/confirm` : 確定日決定
  - `POST   /api/events/admin/:adminToken/restaurants` : 店候補追加 (Day 7)

---

## 実装上の重要ルール

### ローカルURL・デバッグコードの禁止

- `src/` 配下のファイルでは、コメント内も含め `localhost` / `127.0.0.1` を記述しないこと
- `src/` 配下のファイルに `debugger` 文を残さないこと
- CI (GitHub Actions) で自動検出され、ビルドが失敗する

### Workers Runtime 制約

- Node.js 固有 API (`fs`, `path`, `process`, `net` 等) は使用禁止
- 使用するライブラリは Workers Runtime 互換のものに限る
- 環境変数は `env` バインディング経由で取得する

### DB アクセス

- DB 接続は D1 バインディング経由 (`env.DB`)
- 外部接続文字列は使わない
- クエリは Drizzle ORM 経由。生 SQL は原則使用禁止(マイグレーションを除く)

### フッターの扱い

- `<Footer />` は App.tsx ではなく各ページコンポーネントが直接 import して使う
- 新規ページ追加時は `<Footer />` を return に含めること
- 含めない例外: 利用規約・プライバシーポリシー・FAQ・サンクス系など「行き止まり」のページ

### ライブラリ追加

- 新規ライブラリの追加は**事前相談**
- Workers Runtime 互換性を必ず確認すること
- バージョンは執筆時点の最新を使う

### 情報の鮮度

- **推測で書かない**。Cloudflare エコシステムは変化が速く、学習データが古い可能性がある
- 不明点は公式ドキュメントを参照すること
  - Cloudflare Workers : https://developers.cloudflare.com/workers/
  - Cloudflare D1 : https://developers.cloudflare.com/d1/
  - Hono : https://hono.dev/
  - Drizzle ORM : https://orm.drizzle.team/
- 特に以下の領域は古い情報が出回っているので注意
  - Workers Assets (Pages ではない)
  - D1 のバインディング方式
  - Drizzle の D1 対応

---

## Claude Code への発注方針

- 指示は日本語で行う
- **大きな変更は必ず計画を先に提示し、承認後に実装すること**
- 1 タスク 1 単位の粒度を意識する
- 既存ファイルの改変時は、改変範囲を明示すること
- 新規ライブラリ追加時は事前相談
- スコープ外機能の提案・実装は行わない
- 動作確認済みでない限り「動きました」と報告しない
- エラーが出た場合は、推測で修正せず原因を特定してから修正する

---

## プランファイルの保存先

- EnterPlanMode で作成したプランは `docs/plans/plan-{slug}.md` に保存する
- デフォルトの `~/.claude/plans/` には保存しない

---

## ブログ記事下書きの成果物ルール

ブログ記事の下書きを作成する際は、以下のルールに従うこと。

### ファイルセット

記事1本につき **必ず2ファイルをセットで作成する**：

- `drafts/weekly/YYYY-MM-DD/{記事名}.md`
- `drafts/weekly/YYYY-MM-DD/wordpress/{記事名}-wp.html`

`.md` のみ、または `.html` のみの作成は禁止。

### フォルダ命名規則

- `drafts/weekly/` 配下のフォルダは**週単位（月〜日）**で切る
- 同じ週の記事は必ず同じフォルダに入れる
- フォルダ名は**その週の最初の記事を作成した日付**（`YYYY-MM-DD` 形式）にする
- 記事の作成日が週の途中でも、その週のフォルダが既に存在すればそちらに入れる

### 確認手順

記事作成前に `drafts/weekly/` を確認し、当該週のフォルダが既に存在するかをチェックすること。

---

## 開発コマンド

詳細は `README.md` を参照。主要コマンドは以下の通り。

```
pnpm dev              # ローカル開発 (wrangler dev / 開発DB接続)
pnpm deploy:dev       # 開発 Worker へデプロイ
pnpm deploy:prod      # 本番 Worker へデプロイ
pnpm db:generate      # Drizzle マイグレーション生成
pnpm db:migrate       # D1 へマイグレーション適用 (ローカル)
pnpm typecheck        # TypeScript 型チェック
```

---

## DB操作のルール

- ローカル開発・動作確認は必ず `--local` フラグを使うこと
- `--remote` フラグは原則使用禁止
- 本番DBへの直接操作は行わないこと
- マイグレーション適用が必要な場合は人間に確認を取ること

---

## 本ファイルの扱い

- この `CLAUDE.md` は Claude Code が**最初に読むこと**
- 本ファイルの変更は人間 (Fujiki) のみが行う
- Claude Code は本ファイルに書かれていない仕様を勝手に追加しない
- 判断に迷ったら本ファイルを参照し、それでも不明な場合は**推測せず質問すること**
