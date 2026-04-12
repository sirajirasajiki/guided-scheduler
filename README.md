# guided-scheduler

飲み会・イベントの日程調整と店候補共有を行う Web ツール。

React (Vite) + Hono を単一の Cloudflare Worker で配信する構成。

---

## 技術スタック

| 役割 | 技術 |
|------|------|
| フロントエンド | React + Vite + TypeScript + Tailwind CSS v4 |
| バックエンド | Hono + TypeScript |
| DB | Cloudflare D1 (SQLite) |
| ORM | Drizzle ORM |
| 実行環境 | Cloudflare Workers + Workers Assets |
| パッケージ管理 | pnpm |

---

## セットアップ

```bash
pnpm install
```

`wrangler.toml` は `.gitignore` 対象のため、新規セットアップ時は別途用意すること。

---

## 開発コマンド

```bash
# ローカル開発（wrangler dev）
pnpm dev

# フロントエンドビルドのみ
pnpm build

# ビルド → wrangler dev でビルド後の動作確認
pnpm preview
```

ローカル開発時は `http://localhost:8787` でアクセスできる。

---

## DB マイグレーション

```bash
# マイグレーションファイル生成（schema.ts の変更後に実行）
pnpm db:generate

# ローカル D1 へ適用
pnpm db:migrate

# 本番 D1 へ適用
pnpm db:migrate:prod
```

---

## デプロイ

```bash
# ビルド → Cloudflare Workers へデプロイ
pnpm deploy
```

デプロイ先: `https://guided-scheduler.sirajira.workers.dev`
