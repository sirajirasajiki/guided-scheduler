# 検証ログ

## Day 1 (2026-04-12)

### 作業内容

- Vite + React + TypeScript + Tailwind v4 セットアップ
- Hono + Cloudflare Workers + Workers Assets で同一 Worker 構成
- Cloudflare D1 作成、Drizzle ORM セットアップ
- events / participants テーブルのスキーマ定義とマイグレーション適用
- 初回デプロイ完了

### 詰まったポイント

- `App.css` を削除し忘れて build エラー
- `/api/hello` が SPA フォールバックされる問題 → `run_worker_first` で解消
- workers.dev サブドメインの初期登録が必要だった
- リポジトリルートで `create vite` を実行したため `guided-scheduler/guided-scheduler/` のネスト構造が発生 → ファイルをルートに移動して解消

### 所感

- Day 1 は予定通り 1.5〜2 時間で完了
- Workers Assets の挙動 (Hono との優先順位) は事前知識なしだと詰まる
- Tailwind v4 は設定ファイルゼロで動くのが想像以上に楽

### Claude Code 使用状況

- 実装は自分で行い、Claude Code は調査・確認用途で使用
- 質問・調査は対話型 Claude (本チャット) も併用

#### Claude Code に出したプロンプト

- フォルダ構成の確認と修正依頼
  → `guided-scheduler/guided-scheduler/` のネストを発見・解消
- commit 前の `.gitignore` 漏れ確認
  → `.dev.vars`、`*.db`、`*.sqlite` を追記
- Drizzle セットアップ後の `.gitignore` 更新要否確認
  → 不要と判断（`migrations/` は git 管理すべきと確認）
