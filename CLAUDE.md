# 幹事ツール - Claude Code 完全委任検証プロジェクト

## プロジェクト概要
飲み会・イベントの日程調整と店候補共有を行うWebツール。
本プロジェクトは Claude Code への完全委任開発を検証する目的で実施する、
2週間のタイムボックス付き検証プロジェクトである。

## 検証の目的
- アイデアから動くものまでのデリバリー速度を測定する
- Claude Code 完全委任時の「理解負債」の発生を観測する
- 発注スキル(要件定義力)の訓練
- ブログ記事化を前提とした定量・定性データの収集

## 検証スケジュール(参考)
- Day 1     : セットアップ(人間主導)
- Day 2-4   : 初回実装(Claude Code 完全委任)
- Day 5-6   : 意図的に空ける
- Day 7     : 機能追加①(店候補共有)
- Day 8-9   : 意図的に空ける
- Day 10    : 機能追加②(Day 7 時点で決定)
- Day 11-12 : 空ける or バグ修正
- Day 13    : 総括・コードリーディング日
- Day 14    : ブログ記事執筆

---

## 技術スタック

- フロントエンド  : React + Vite + TypeScript + Tailwind CSS
- バックエンド    : Hono + TypeScript
- DB              : Cloudflare D1 (SQLite)
- ORM             : Drizzle ORM
- 実行環境        : Cloudflare Workers (単一 Worker)
- 静的アセット    : Workers Assets (同一 Worker 内で SPA を配信)
- パッケージ管理  : pnpm
- デプロイ        : wrangler deploy

### 構成の特徴
- フロントとバックエンドを同一 Worker 内で配信する
  - `/api/*`  → Hono が処理
  - それ以外  → Workers Assets から React の SPA を配信
- CORS 設定不要、ドメイン1つで完結、デプロイ1コマンド

---

## ディレクトリ構成

```
guided-scheduler/
├── src/
│   ├── client/            # React (Vite)
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── pages/
│   │   └── lib/
│   ├── server/            # Hono
│   │   ├── index.ts       # Workers entry point
│   │   ├── routes/
│   │   └── db/
│   │       ├── schema.ts  # Drizzle schema
│   │       └── client.ts
│   └── shared/            # フロント・バック共有
│       └── types.ts       # DTO / API 型定義
├── migrations/            # D1 マイグレーション
├── public/
├── docs/
│   └── log.md             # 検証記録(日次更新)
├── wrangler.toml
├── vite.config.ts
├── drizzle.config.ts
├── package.json
├── tsconfig.json
└── CLAUDE.md
```

- フロント・バックエンドで型を共有すること(`src/shared/types.ts`)
- API のリクエスト/レスポンス型は shared に集約

---

## 機能スコープ

### 初回実装 (Day 2-4)
- 幹事がイベントを作成できる
  - イベント名
  - 候補日 3〜5 個
- イベント作成時に以下の 2 URL を発行
  - **管理用リンク** : `/admin/:adminToken`
  - **共有用リンク** : `/event/:shareToken`
- 参加者は共有用リンクから以下を入力
  - 名前(必須)
  - 各候補日に ◯ / △ / × で回答
- 幹事は管理用リンクから以下が可能
  - 回答状況の一覧表示
  - 確定日の選択・決定

### 機能追加 ① (Day 7)
- 幹事が店候補を追加できる
  - 店名
  - URL
  - メモ(短文)
- 参加者ページで店候補を閲覧できる

### 機能追加 ② (Day 10)
- **未定**。Day 7 終了時点の理解負債状況を見て決定する
- 候補 : 店への投票機能 / コメント機能 / etc

---

## やらないこと (スコープ外)

- 認証機構全般(ログイン、パスワード、OAuth)
- メール、LINE、その他通知機能
- 参加者の編集・削除機能(回答の上書きは可)
- テストコード(E2E / ユニット問わず。検証の本筋から外れるため)
- 多言語対応
- PWA 化
- アクセシビリティ対応の深追い
- 細かいバリデーションエラーメッセージの i18n
- 自動デプロイ (GitHub Actions 等)
- パフォーマンス最適化

---

## データモデル (初期案)

Drizzle schema を `src/server/db/schema.ts` に定義する。

### events
- `id`             : text (UUID), PK
- `name`           : text, NOT NULL
- `admin_token`    : text (UUID), UNIQUE, NOT NULL
- `share_token`    : text (UUID), UNIQUE, NOT NULL
- `candidate_dates`: text (JSON array of ISO date strings)
- `confirmed_date` : text (nullable, ISO date)
- `created_at`     : integer (unix timestamp)

### participants
- `id`         : text (UUID), PK
- `event_id`   : text, FK → events.id
- `name`       : text, NOT NULL
- `responses`  : text (JSON : `{ [date: string]: "o" | "d" | "x" }`)
- `created_at` : integer (unix timestamp)

### restaurants (Day 7 で追加)
- `id`         : text (UUID), PK
- `event_id`   : text, FK → events.id
- `name`       : text, NOT NULL
- `url`        : text (nullable)
- `memo`       : text (nullable)
- `created_at` : integer (unix timestamp)

---

## セキュリティ前提

本プロジェクトは**検証目的のため、セキュリティは最小限**とする。
本番化時に以下を再検討する。

- 認証・認可(現在は一切なし)
- トークンのエントロピー・長さ
- SQL インジェクション対策(Drizzle で基本対応、要レビュー)
- XSS 対策(React のデフォルトで基本対応)
- CSRF 対策
- レートリミット
- 入力値バリデーションの強化
- ログに個人情報を出さない
- データ削除ポリシー

コード中に本番化時 TODO を `// TODO(prod):` のコメントで残すこと。

---

## データ保持

- 検証中は無期限保存(削除処理は実装しない)
- `// TODO(prod):` 自動削除ポリシーを検討

---

## 命名規則

- ファイル名     : kebab-case (例: `event-form.tsx`)
- コンポーネント : PascalCase
- 関数・変数     : camelCase
- DB テーブル・カラム : snake_case
- API エンドポイント : RESTful
  - `POST   /api/events`                    : イベント作成
  - `GET    /api/events/admin/:adminToken`  : 管理用取得
  - `GET    /api/events/share/:shareToken`  : 共有用取得
  - `POST   /api/events/share/:shareToken/participants` : 回答送信
  - `PATCH  /api/events/admin/:adminToken/confirm`      : 確定日決定
  - `POST   /api/events/admin/:adminToken/restaurants`  : 店候補追加 (Day 7)

---

## 実装上の重要ルール

### Workers Runtime 制約
- Node.js 固有 API (`fs`, `path`, `process`, `net` 等) は使用禁止
- 使用するライブラリは Workers Runtime 互換のものに限る
- 環境変数は `env` バインディング経由で取得する

### DB アクセス
- DB 接続は D1 バインディング経由 (`env.DB`)
- 外部接続文字列は使わない
- クエリは Drizzle ORM 経由。生 SQL は原則使用禁止(マイグレーションを除く)

### ライブラリ追加
- 新規ライブラリの追加は**事前相談**
- Workers Runtime 互換性を必ず確認すること
- バージョンは執筆時点の最新を使う

### 情報の鮮度
- **推測で書かない**。Cloudflare エコシステムは変化が速く、学習データが古い可能性がある
- 不明点は公式ドキュメントを参照すること
  - Cloudflare Workers : https://developers.cloudflare.com/workers/
  - Cloudflare D1       : https://developers.cloudflare.com/d1/
  - Hono                : https://hono.dev/
  - Drizzle ORM         : https://orm.drizzle.team/
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

## 開発コマンド (想定)

```
pnpm dev          # ローカル開発 (wrangler dev)
pnpm build        # フロント(Vite)ビルド
pnpm deploy       # Cloudflare へデプロイ
pnpm db:generate  # Drizzle マイグレーション生成
pnpm db:migrate   # D1 へマイグレーション適用 (ローカル)
pnpm db:migrate:prod  # D1 へマイグレーション適用 (本番)
pnpm typecheck    # TypeScript 型チェック
```

---

## 検証記録(観測用)

`docs/log.md` に日次で以下を記録する。人間 (Fujiki) が書く。

- その日 Claude Code に出した主要プロンプト(コピペで保存)
- 手戻りが発生した箇所と原因
- 「これ自分で書いた方が早かった」と感じた瞬間
- 気づき・違和感
- Day 7, 10 の機能追加時は「自力でどこを直せばいいか即答できたか」を 5 段階評価

この記録がブログ記事の一次素材になる。後から思い出して書くのは不可能なので、
当日中に必ず書くこと。

---

## 検証の成否指標(事前定義)

Day 14 の振り返り時に自己採点する。

- **速度**      : 着想からデプロイまでの実時間 (目標: 初回実装 8 時間以内)
- **理解度**    : Day 7 / Day 10 で機能追加する際、自力で修正箇所を即答できたか (5段階)
- **発注品質**  : Claude Code への指示で手戻りが発生した回数
- **再現性**    : 同じ手順を別プロジェクトで使えそうか (5段階)
- **コード規模**: 総行数・ファイル数 (目安: 初回 1000 行以下、最終 1500 行以下)

---

## 本ファイルの扱い

- この `CLAUDE.md` は Claude Code が**最初に読むこと**
- 本ファイルの変更は人間 (Fujiki) のみが行う
- Claude Code は本ファイルに書かれていない仕様を勝手に追加しない
- 判断に迷ったら本ファイルを参照し、それでも不明な場合は**推測せず質問すること**
