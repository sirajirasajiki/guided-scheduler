# guided-scheduler

飲み会・イベントの日程調整と店候補共有を行う Web ツール。

幹事がイベントを作成すると管理用・共有用の 2 種類のリンクが発行される。参加者は共有リンクから候補日に ◯/△/× で回答し、幹事は管理リンクから回答状況を確認して確定日を決定できる。

React (Vite) + Hono を単一の Cloudflare Worker で配信する構成。`/api/*` は Hono が処理し、それ以外は Workers Assets から React SPA を配信する。CORS 設定不要・デプロイ 1 コマンド。

---

## 技術スタック

| 役割 | 技術 |
|------|------|
| フロントエンド | React + Vite + TypeScript + Tailwind CSS v4 |
| バックエンド | Hono + TypeScript |
| DB | Cloudflare D1 (SQLite) |
| ORM | Drizzle ORM |
| ルーティング | react-router-dom v7 |
| 実行環境 | Cloudflare Workers + Workers Assets |
| パッケージ管理 | pnpm |

---

## セットアップ

```bash
pnpm install
```

`wrangler.toml` は `.gitignore` 対象のため、新規セットアップ時は別途用意すること。

---

## 開発コマンド一覧

```bash
# ローカル開発（wrangler dev / http://localhost:8787）
pnpm dev

# フロントエンドビルド（Vite）
pnpm build

# ビルド後の動作確認（wrangler dev）
pnpm preview

# Cloudflare Workers へデプロイ
pnpm deploy

# マイグレーションファイル生成（schema.ts 変更後に実行）
pnpm db:generate

# ローカル D1 へマイグレーション適用
pnpm db:migrate

# 本番 D1 へマイグレーション適用
pnpm db:migrate:prod
```

デプロイ先: `https://guided-scheduler.sirajira.workers.dev`

---

## ディレクトリ構成

```
guided-scheduler/
├── src/
│   ├── client/            # React (Vite) フロントエンド
│   │   ├── main.tsx       # エントリポイント
│   │   ├── App.tsx        # ルーター定義
│   │   ├── pages/         # 各ページコンポーネント
│   │   │   ├── create-event.tsx  # イベント作成ページ (/)
│   │   │   ├── admin.tsx         # 管理ページ (/admin/:adminToken)
│   │   │   └── event.tsx         # 参加者ページ (/event/:shareToken)
│   │   └── lib/
│   │       └── api.ts     # API fetch ラッパー
│   ├── server/            # Hono バックエンド
│   │   ├── index.ts       # Workers エントリポイント・ルート登録
│   │   ├── routes/
│   │   │   └── events.ts  # /api/events 配下の全エンドポイント
│   │   └── db/
│   │       ├── schema.ts  # Drizzle スキーマ定義
│   │       └── client.ts  # D1 クライアント初期化
│   └── shared/
│       └── types.ts       # フロント・バック共有の DTO 型定義
├── migrations/            # Drizzle が生成する D1 マイグレーション SQL
├── public/                # 静的アセット
├── docs/                  # 設計資料・検証ログ
├── wrangler.toml          # Cloudflare Workers 設定（.gitignore 対象）
├── vite.config.ts
├── drizzle.config.ts
└── package.json
```

---

## API エンドポイント一覧

### `POST /api/events`
イベントを新規作成する。

**リクエスト**
```json
{ "name": "5月の飲み会", "candidateDates": ["2026-05-10", "2026-05-17", "2026-05-24"] }
```
- `candidateDates`: ISO date string の配列（3〜5 個）

**レスポンス** `201`
```json
{ "eventId": "...", "adminToken": "...", "shareToken": "..." }
```

---

### `GET /api/events/admin/:adminToken`
管理用トークンでイベント情報と全参加者の回答を取得する。

**レスポンス** `200`
```json
{
  "eventId": "...",
  "name": "5月の飲み会",
  "candidateDates": ["2026-05-10", "2026-05-17", "2026-05-24"],
  "confirmedDate": null,
  "participants": [
    { "id": "...", "name": "山田", "responses": { "2026-05-10": "o", "2026-05-17": "x", "2026-05-24": "d" }, "createdAt": 1234567890 }
  ],
  "createdAt": 1234567890
}
```

---

### `GET /api/events/share/:shareToken`
共有用トークンでイベント情報を取得する（参加者向け・回答データなし）。

**レスポンス** `200`
```json
{ "eventId": "...", "name": "5月の飲み会", "candidateDates": ["..."], "confirmedDate": null }
```

---

### `POST /api/events/share/:shareToken/participants`
参加者の回答を送信する。同名の参加者が既に存在する場合は回答を上書きする。

**リクエスト**
```json
{ "name": "山田", "responses": { "2026-05-10": "o", "2026-05-17": "x", "2026-05-24": "d" } }
```
- `responses` の値: `"o"`（◯）/ `"d"`（△）/ `"x"`（×）

**レスポンス** `201`
```json
{ "participantId": "..." }
```

---

### `PATCH /api/events/admin/:adminToken/confirm`
確定日を決定する。`date` は `candidateDates` のいずれかである必要がある。

**リクエスト**
```json
{ "date": "2026-05-10" }
```

**レスポンス** `200`
```json
{ "confirmedDate": "2026-05-10" }
```

---

## データモデル

### events

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | text (UUID) | PK |
| `name` | text | イベント名 |
| `admin_token` | text (UUID) | 管理用トークン（UNIQUE） |
| `share_token` | text (UUID) | 共有用トークン（UNIQUE） |
| `candidate_dates` | text | 候補日の JSON 配列（ISO date strings） |
| `confirmed_date` | text (nullable) | 確定日（ISO date string） |
| `created_at` | integer | Unix タイムスタンプ |

### participants

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | text (UUID) | PK |
| `event_id` | text | FK → events.id |
| `name` | text | 参加者名 |
| `responses` | text | 回答の JSON オブジェクト `{ [date]: "o"|"d"|"x" }` |
| `created_at` | integer | Unix タイムスタンプ |

---

## 既知の制約・スコープ外

### 現時点の既知制約
- 管理ページ（`/admin/:adminToken`）から参加者向け共有リンクを直接コピーできない。共有リンクはイベント作成完了画面でのみ表示される（`GetEventAdminResponse` に `shareToken` が含まれていないため）
- 認証・認可は一切なし。`adminToken` / `shareToken` を知っている人なら誰でもアクセスできる

### スコープ外（意図的に実装しない）
- ログイン・パスワード・OAuth などの認証機構
- メール・LINE などの通知機能
- 参加者の削除機能（回答の上書きは可）
- テストコード
- 自動デプロイ（GitHub Actions 等）
- パフォーマンス最適化・PWA 化
