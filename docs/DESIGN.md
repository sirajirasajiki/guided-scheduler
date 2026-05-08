# 幹事ツール - 設計・仕様ドキュメント

> このファイルはプロジェクトの背景・設計・仕様を記録する。
> Claude Code への行動指示は `CLAUDE.md` を参照すること。

---

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

- Day 1 : セットアップ(人間主導)
- Day 2-4 : 初回実装(Claude Code 完全委任)
- Day 5-6 : 意図的に空ける
- Day 7 : 機能追加①(店候補共有)
- Day 8-9 : 意図的に空ける
- Day 10 : 機能追加②(Day 7 時点で決定)
- Day 11-12 : 空ける or バグ修正
- Day 13 : 総括・コードリーディング日
- Day 14 : ブログ記事執筆

---

## 技術スタック

- フロントエンド : React + Vite + TypeScript + Tailwind CSS
- バックエンド : Hono + TypeScript
- DB : Cloudflare D1 (SQLite)
- ORM : Drizzle ORM
- 実行環境 : Cloudflare Workers (単一 Worker)
- 静的アセット : Workers Assets (同一 Worker 内で SPA を配信)
- パッケージ管理 : pnpm
- デプロイ : wrangler deploy

### 構成の特徴

- フロントとバックエンドを同一 Worker 内で配信する
  - `/api/*` → Hono が処理
  - それ以外 → Workers Assets から React の SPA を配信
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

- `id` : text (UUID), PK
- `name` : text, NOT NULL
- `admin_token` : text (UUID), UNIQUE, NOT NULL
- `share_token` : text (UUID), UNIQUE, NOT NULL
- `candidate_dates`: text (JSON array of ISO date strings)
- `confirmed_date` : text (nullable, ISO date)
- `created_at` : integer (unix timestamp)

### participants

- `id` : text (UUID), PK
- `event_id` : text, FK → events.id
- `name` : text, NOT NULL
- `responses` : text (JSON : `{ [date: string]: "o" | "d" | "x" }`)
- `created_at` : integer (unix timestamp)

### restaurants (Day 7 で追加)

- `id` : text (UUID), PK
- `event_id` : text, FK → events.id
- `name` : text, NOT NULL
- `url` : text (nullable)
- `memo` : text (nullable)
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

## 検証記録(観測用)

`docs/log/` に日次で以下を記録する。人間 (Fujiki) が書く。

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

- **速度** : 着想からデプロイまでの実時間 (目標: 初回実装 8 時間以内)
- **理解度** : Day 7 / Day 10 で機能追加する際、自力で修正箇所を即答できたか (5段階)
- **発注品質** : Claude Code への指示で手戻りが発生した回数
- **再現性** : 同じ手順を別プロジェクトで使えそうか (5段階)
- **コード規模**: 総行数・ファイル数 (目安: 初回 1000 行以下、最終 1500 行以下)
