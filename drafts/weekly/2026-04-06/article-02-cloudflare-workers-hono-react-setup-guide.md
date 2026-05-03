---
title: "Cloudflare Workers + Hono + React + D1 + Drizzle ORM のセットアップ手順書"
slug: "cloudflare-workers-hono-react-setup-guide"
status: "draft"
source_dates:
  - "2026-04-12"
tags:
  - "Cloudflare Workers"
  - "Hono"
  - "React"
  - "Vite"
  - "Drizzle ORM"
  - "D1"
  - "セットアップ"
seo_title: "Cloudflare Workers + Hono + React + D1 + Drizzle ORM セットアップ手順書【コピペで再現】"
keywords: "Cloudflare Workers, Hono, React, Vite, D1, Drizzle ORM, セットアップ, 手順, Tailwind CSS v4, Workers Assets"
meta:
  description_candidates:
    - "Cloudflare Workers + Hono + React + D1 + Drizzle ORM の環境をゼロから構築する手順書。インストールから本番デプロイまで、上から順にコピペすれば同じ構成が再現できます。"
    - "Cloudflare Workers に React フロントエンドと Hono バックエンドを同居させる構成のセットアップ手順書。Tailwind CSS v4・D1・Drizzle ORM 含む全15ステップを完全収録。"
    - "単一 Worker で React + Hono + D1 を動かす構成のコピペ手順書。Workers Assets の設定から D1 マイグレーション・本番デプロイまで、つまずきポイントを踏まえたステップで解説。"
---

こんにちは、白々さじきです。

前回の記事で Cloudflare Workers + Hono + React + D1 の環境構築でハマったポイントを紹介しました。今回はその姉妹記事として、**上から順にコピペすれば同じ構成が再現できる手順書**をまとめます。

「とにかく動く環境を作りたい」という方は、こちらをそのままなぞってもらえばOKです。詰まりやすいポイントの解説は前回の記事に書いているので、エラーが出たらそちらと併読してください。

## 完成する構成

- フロントエンド: React + Vite + TypeScript + Tailwind CSS v4
- バックエンド: Hono + TypeScript
- DB: Cloudflare D1 (SQLite)
- ORM: Drizzle ORM
- 実行環境: Cloudflare Workers (単一 Worker)
- パッケージマネージャ: pnpm

`/api/*` は Hono が処理し、それ以外は React の SPA を配信する構成です。フロントとバックが同じ Worker 上で動くので、CORS 設定不要・1コマンドでデプロイできます。

## 前提

- Node.js 20 以上がインストール済み
- pnpm がインストール済み (`npm install -g pnpm`)
- Git がインストール済み
- Cloudflare アカウントを持っている
- GitHub アカウントを持っている

## ステップ1: プロジェクト作成

親ディレクトリに移動して、Vite で React + TypeScript プロジェクトを作成します。

```
cd ~/Projects
pnpm create vite guided-scheduler --template react-ts
cd guided-scheduler
pnpm install
```

プロジェクト名 (`guided-scheduler`) は好きに変えてOKです。以降この記事ではこの名前で進めます。

## ステップ2: Tailwind CSS v4 のセットアップ

```
pnpm add -D tailwindcss @tailwindcss/vite
```

`vite.config.ts` を以下に置き換えます。

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
  },
});
```

`src/index.css` の中身を全部消して、以下の1行だけにします。

```css
@import "tailwindcss";
```

`tailwind.config.js` や `postcss.config.js` は **作りません**。v4 では不要です。

## ステップ3: Hono と wrangler のインストール

```
pnpm add hono
pnpm add -D wrangler @cloudflare/workers-types
```

Cloudflare にログインします。

```
pnpm wrangler login
```

ブラウザが開くので「Allow」を押してください。

## ステップ4: ディレクトリ整理

クライアント側のファイルを `src/client/` に移動します。

```
mkdir -p src/client src/server src/server/db src/shared
mv src/main.tsx src/App.tsx src/index.css src/client/
mv src/assets src/client/
```

`src/App.css` がある場合は不要なので削除してください。

```
rm src/App.css
```

`index.html` (プロジェクトルート) の `<script>` タグのパスを修正します。

```html
<script type="module" src="/src/client/main.tsx"></script>
```

`src/client/App.tsx` の `import "./App.css"` の行を削除し、中身をシンプルにします。

```tsx
function App() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-blue-500">Tailwind 動作確認</h1>
    </div>
  );
}

export default App;
```

## ステップ5: Hono エントリポイント作成

`src/server/index.ts` を新規作成します。

```ts
import { Hono } from "hono";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/api/hello", (c) => {
  return c.json({ message: "Hello from Hono on Workers!" });
});

export default app;
```

## ステップ6: TypeScript 設定の分離

クライアントとサーバーで TypeScript の型の世界が違うので、サーバー用の tsconfig を別に作ります。

`tsconfig.server.json` を新規作成します。

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["@cloudflare/workers-types"],
    "lib": ["ES2022"],
    "noEmit": true
  },
  "include": ["src/server/**/*", "src/shared/**/*"]
}
```

ルートの `tsconfig.json` の `references` に追加します。

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.server.json" }
  ]
}
```

`tsconfig.app.json` の `include` から `src/server` を除外します。

```json
{
  "include": ["src"],
  "exclude": ["src/server", "src/shared"]
}
```

## ステップ7: wrangler.toml の作成

プロジェクトルートに `wrangler.toml` を新規作成します。

```toml
name = "guided-scheduler"
main = "src/server/index.ts"
compatibility_date = "2025-04-01"

[assets]
directory = "./dist/client"
not_found_handling = "single-page-application"
binding = "ASSETS"
run_worker_first = ["/api/*"]
```

ポイントは `run_worker_first = ["/api/*"]` です。これがないと `/api/*` が SPA フォールバックされて Hono に届きません。

## ステップ8: D1 データベース作成

```
pnpm wrangler d1 create guided-scheduler
```

実行すると以下のような出力が出るので、`[[d1_databases]]` のブロックを `wrangler.toml` の末尾に貼り付けます。

```toml
[[d1_databases]]
binding = "DB"
database_name = "guided-scheduler"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

## ステップ9: Drizzle ORM セットアップ

```
pnpm add drizzle-orm
pnpm add -D drizzle-kit
```

`src/server/db/schema.ts` を新規作成します (例: イベント管理用のテーブル)。

```ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  adminToken: text("admin_token").notNull().unique(),
  shareToken: text("share_token").notNull().unique(),
  candidateDates: text("candidate_dates").notNull(),
  confirmedDate: text("confirmed_date"),
  createdAt: integer("created_at").notNull(),
});
```

`src/server/db/client.ts` を新規作成します。

```ts
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export const createDb = (d1: D1Database) => {
  return drizzle(d1, { schema });
};
```

プロジェクトルートに `drizzle.config.ts` を新規作成します。

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
});
```

## ステップ10: マイグレーション生成と適用

スキーマから SQL マイグレーションを生成します。

```
pnpm drizzle-kit generate
```

`migrations/` フォルダに `0000_xxx.sql` のようなファイルが生成されます。

ローカル D1 に適用します。

```
pnpm wrangler d1 migrations apply guided-scheduler --local
```

本番 D1 にも適用します (あとからでもOK)。

```
pnpm wrangler d1 migrations apply guided-scheduler --remote
```

## ステップ11: package.json のスクリプト整備

`package.json` の `scripts` を以下に置き換えます。

```json
"scripts": {
  "dev": "wrangler dev",
  "build": "vite build",
  "deploy": "vite build && wrangler deploy",
  "preview": "vite build && wrangler dev"
}
```

## ステップ12: D1 から取得する API への書き換え

動作確認のため、`src/server/index.ts` を D1 からデータを取る形に書き換えます。

```ts
import { Hono } from "hono";
import { createDb } from "./db/client";
import { events } from "./db/schema";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/api/hello", async (c) => {
  const db = createDb(c.env.DB);
  const allEvents = await db.select().from(events).all();
  return c.json({
    message: "Hello from Hono on Workers!",
    eventCount: allEvents.length,
  });
});

export default app;
```

## ステップ13: ローカル動作確認

```
pnpm dev
```

ブラウザで以下にアクセスします。

- `http://localhost:8787/` → Tailwind の青い文字が表示される
- `http://localhost:8787/api/hello` → `{"message":"Hello from Hono on Workers!","eventCount":0}` が返る

両方OKならローカル環境構築は完了です。

## ステップ14: workers.dev サブドメインの登録

初回デプロイ前に、Cloudflare ダッシュボードから workers.dev サブドメインを登録しておきます。

1. https://dash.cloudflare.com にログイン
2. 左サイドバーの「Compute」→「Workers & Pages」を開く
3. 右側の「Account Details」セクションの「Subdomain」項目から好きな名前を登録

サブドメインはアカウント全体で1つだけ持てる識別子です。プロジェクト名は入れず、自分のハンドルネームなどにするのがおすすめです。

## ステップ15: 本番デプロイ

```
pnpm deploy
```

成功すると `https://guided-scheduler.<your-subdomain>.workers.dev` が出力されます。

ブラウザで `<your-url>/api/hello` を開いて、ローカルと同じ JSON が返れば本番デプロイ完了です。

なお、サブドメイン登録直後は SSL 証明書発行に5〜15分ほどかかります。すぐにアクセスできなくても焦らず待ちましょう。

## ステップ16: .gitignore と GitHub 連携

`.gitignore` を確認します。最低限以下が含まれていればOKです。

```
node_modules
dist
.wrangler
.dev.vars
```

GitHub で空のリポジトリを作って (private 推奨)、ローカルから push します。

```
git init
git add .
git commit -m "初期セットアップ完了"
git branch -M main
git remote add origin git@github.com:<username>/guided-scheduler.git
git push -u origin main
```

## まとめ

ここまでで、Cloudflare Workers 上に React フロントエンド・Hono バックエンド・D1 データベース・Drizzle ORM が揃った環境ができました。

この環境の良いところは、**ゼロ円で本番デプロイまで完結する**ことです。Cloudflare の無料枠内で動くので、検証目的の個人開発には最適だと思います。

各ステップで詰まった場合は、姉妹記事「Cloudflare Workers + Hono + React + D1 環境構築でハマった6つのポイント」で原因と対処を解説しているので、併せて読んでみてください。

## 参考リンク

- Cloudflare Workers 公式: https://developers.cloudflare.com/workers/
- Cloudflare D1 公式: https://developers.cloudflare.com/d1/
- Workers Assets 公式: https://developers.cloudflare.com/workers/static-assets/
- Hono 公式: https://hono.dev/
- Drizzle ORM 公式: https://orm.drizzle.team/
- Tailwind CSS v4 公式: https://tailwindcss.com/docs/installation/using-vite
- Vite 公式: https://vite.dev/
