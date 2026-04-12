---
title: "Cloudflare Workers + Hono + React + D1 環境構築でハマった6つのポイント"
slug: "cloudflare-workers-hono-react-setup-pitfalls"
status: "draft"
source_dates:
  - "2026-04-12"
tags:
  - "Cloudflare Workers"
  - "Hono"
  - "React"
  - "Vite"
  - "Drizzle ORM"
  - "環境構築"
seo_title: "Cloudflare Workers + Hono + React 環境構築でハマった6つのポイント【初心者向け】"
keywords: "Cloudflare Workers, Hono, React, Vite, D1, Drizzle ORM, 環境構築, Tailwind CSS v4, Workers Assets"
meta:
  description_candidates:
    - "Cloudflare Workers + Hono + React + D1 の環境構築で実際にハマった6つのポイントを原因・解決策つきで解説。Workers Assets の落とし穴や Tailwind v4 の変更点など初学者が詰まりやすい箇所を網羅。"
    - "Cloudflare Workers に React と Hono を同居させる構成の環境構築でハマった落とし穴6選。create vite のネスト・run_worker_first の設定・Tailwind v4 の新方式など、公式ドキュメントだけでは気づきにくいポイントを解説。"
    - "Workers Assets + Hono + React + D1 構成の環境構築でハマりやすい6つの落とし穴を解説。Cloudflare Pages との混同・workers.dev サブドメイン登録など初心者がつまずく箇所を原因から解説します。"
---

こんにちは、白々さじきです。

最近、個人開発で Cloudflare Workers + Hono + React + D1 の構成を試してみました。シンプルで強力な構成なのですが、実際に環境構築してみると公式ドキュメントだけでは見えにくい落とし穴がいくつもありました。

この記事では、私が実際に踏んだ詰まりポイントを6つ、原因と解決策つきで紹介します。同じ構成にチャレンジする初学者の方の助けになれば嬉しいです。

なお、同じ構成を最初から再現するためのセットアップ手順書は別記事としてまとめています。「詰まりポイントよりまず動く環境を作りたい」という方はそちらをどうぞ。

## 結論

Cloudflare Workers + Hono + React + D1 の環境構築では、以下の6つに注意するだけで体感の詰まり時間が大幅に減ります。

1. `pnpm create vite` はプロジェクトディレクトリの「外」で実行する
2. Vite テンプレートの `App.css` は使わないなら import を必ず消す
3. Workers Assets と Hono を併用するときは `run_worker_first` を設定する
4. Workers Assets は Cloudflare Pages とは別物、情報の混同に注意
5. 初回デプロイ前に workers.dev サブドメインの登録が必要
6. Tailwind CSS v4 はもう `tailwind.config.js` を作らない

それぞれ詳しく見ていきます。

## 背景：今回試した構成

今回構築した環境は次の通りです。

- フロントエンド: React + Vite + TypeScript + Tailwind CSS v4
- バックエンド: Hono + TypeScript
- DB: Cloudflare D1 (SQLite)
- ORM: Drizzle ORM
- 実行環境: Cloudflare Workers (単一 Worker でフロントとバックを同居)
- パッケージマネージャ: pnpm

ポイントは「単一 Worker でフロントエンドとバックエンドを両方配信する」構成です。`/api/*` は Hono で処理し、それ以外は Workers Assets で React の SPA を返します。CORS 設定も不要、デプロイも 1 コマンドで済む、軽量で気持ちのいい構成です。

ただ、この構成は比較的新しく、日本語情報も少ないので、初学者にはハマりどころが多いのも事実でした。

## 詰まりポイント1: create vite でディレクトリがネストする

### 何が起きたか

最初に `pnpm create vite` を実行するとき、すでに `guided-scheduler` というディレクトリを作ってその中に入った状態でコマンドを叩いてしまいました。

すると Vite はプロジェクト名を聞いてくるので、また `guided-scheduler` と答えてしまい、結果として `guided-scheduler/guided-scheduler/` という二重ネストのフォルダ構造ができてしまいました。

### NG例

```
mkdir guided-scheduler
cd guided-scheduler
pnpm create vite
# プロジェクト名: guided-scheduler
# → ./guided-scheduler/guided-scheduler/ ができてしまう
```

### OK例

リポジトリのルートで `create vite` を実行する場合、プロジェクト名は `.` (カレントディレクトリ) を指定するか、そもそも親ディレクトリで実行します。

```
# 方法A: 親ディレクトリで実行
cd ~/Projects
pnpm create vite guided-scheduler
cd guided-scheduler

# 方法B: 既にディレクトリ内にいる場合は . を指定
cd guided-scheduler
pnpm create vite .
```

### 解決策（ハマってしまった場合）

私の場合はネストした後で気づいたので、内側の `guided-scheduler/` の中身を全部親に移動して、空になった内側フォルダを削除しました。`.gitignore` などの隠しファイルも忘れずに移動するのがポイントです。

## 詰まりポイント2: App.css の import を消し忘れて build エラー

### 何が起きたか

Vite が生成した `src/App.tsx` には最初から `import "./App.css"` という行が入っています。私は CLAUDE.md のディレクトリ構成方針に合わせて `src/client/` 配下にファイルを移動したのですが、移動時に `App.css` を一緒に移動しなかった結果、build 時に次のエラーが出ました。

```
[UNRESOLVED_IMPORT] Error: Could not resolve './App.css' in src/client/App.tsx
```

### 解決策

Tailwind CSS を使う前提なので、そもそも `App.css` は不要です。`src/client/App.tsx` を開いて、次の1行を削除すれば解決します。

```tsx
import "./App.css";
```

ついでに `App.tsx` の中身も Vite のサンプルカウンターから自分用のシンプルな初期画面に置き換えてしまうのが楽です。

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

## 詰まりポイント3: /api/hello が Hono に届かず SPA フォールバックされる

### 何が起きたか

Hono で `/api/hello` エンドポイントを作って、`wrangler dev` を起動。ブラウザで `/api/hello` を開いたら、JSON ではなく React の画面（`index.html`）が表示されてしまいました。

ターミナルにエラーは出ていません。けれど Hono にリクエストが届いていない。これは初見だと原因の特定が難しいです。

### 原因

Workers Assets の SPA フォールバック設定が原因でした。`wrangler.toml` でこう書いていました。

```toml
[assets]
directory = "./dist/client"
not_found_handling = "single-page-application"
```

`not_found_handling = "single-page-application"` は「マッチするファイルが無ければ `index.html` を返す」という挙動です。問題は **Workers Assets が Hono より先に評価される** こと。`/api/hello` というパスに対応するファイルが `dist/client/` に無いので、SPA フォールバックで `index.html` が返り、Hono の `/api/hello` ハンドラまで到達していなかったわけです。

### 解決策

`run_worker_first` を追加して、`/api/*` は Hono を優先するように設定します。

```toml
[assets]
directory = "./dist/client"
not_found_handling = "single-page-application"
binding = "ASSETS"
run_worker_first = ["/api/*"]
```

これで `/api/*` のパスは必ず Hono に届き、それ以外は静的配信、無ければ `index.html`、という綺麗な振り分けになります。

## 詰まりポイント4: Workers Assets と Cloudflare Pages を混同する

### 何が起きたか

「Cloudflare で React を配信する方法」を検索すると、検索結果の多くが **Cloudflare Pages** の記事で、Workers Assets の情報がほとんど出てきません。

これは情報が古いのが原因です。Workers Assets は比較的新しい機能で、それ以前は Cloudflare Pages を使うのが主流でした。Pages の記事を真似て設定しようとすると、Workers Assets の最新の書き方とは噛み合わず詰まります。

### 解決策

Workers Assets と Pages は別物、と割り切ること。検索するときは「Workers Assets」というキーワードを明示的に入れ、`wrangler.toml` の `[assets]` セクションを使う方式が現在の正攻法だと覚えておきましょう。

公式ドキュメントは次の URL から辿れます。

- Workers Assets: https://developers.cloudflare.com/workers/static-assets/

古いブログ記事で `[site]` フィールドを使っているものを見かけたら、それは更に前世代の Workers Sites という機能で、こちらも別物です。これも採用しないでください。

## 詰まりポイント5: workers.dev サブドメインの初回登録

### 何が起きたか

`pnpm wrangler deploy` を実行したら、こんなエラーが出ました。

```
You need to register a workers.dev subdomain before publishing to workers.dev
```

### 原因

Cloudflare アカウントには `xxxxx.workers.dev` という形式のサブドメインを **アカウント全体で1つだけ** 持つ仕様があり、それを最初に登録する必要があります。登録していないと Worker をデプロイできません。

### 解決策

Cloudflare ダッシュボードから登録します。

1. https://dash.cloudflare.com にログイン
2. 左サイドバーの「Compute」→「Workers & Pages」を開く
3. 右側の「Account Details」セクションに「Subdomain」という項目がある
4. 鉛筆アイコンから好きなサブドメイン名を登録

サブドメイン名はアカウント全体で共有されるので、プロジェクト名は入れず、自分の識別子（ハンドルネームなど）にするのがおすすめです。今後作るすべての Worker が `<worker-name>.<your-subdomain>.workers.dev` という URL になるためです。

なお、登録直後は SSL 証明書の発行に 5〜15 分ほどかかります。すぐにアクセスできなくても焦らず待ちましょう。

## 詰まりポイント6: Tailwind CSS v4 の新セットアップ方式

### 何が起きたか

Tailwind CSS のセットアップ方法を検索すると、ほぼすべての記事で `tailwind.config.js` を作って `npx tailwindcss init` を実行するように書かれています。これは Tailwind CSS v3 までの方式です。

v4 では大きく変わっていて、古い手順をそのまま実行すると **設定ファイルがあるのに動かない** というよくわからない状態になります。

### Tailwind CSS v4 の正しい手順 (Vite の場合)

v4 では PostCSS や Autoprefixer も不要で、専用の Vite プラグインを使います。

```
pnpm add -D tailwindcss @tailwindcss/vite
```

`vite.config.ts` にプラグインを追加します。

```tsx
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

そして CSS ファイル (`src/index.css` 等) の中身を全部消して、次の1行だけにします。

```css
@import "tailwindcss";
```

これだけ。`tailwind.config.js` も `postcss.config.js` も `npx tailwindcss init` も一切不要です。`content` パスの指定もいりません (自動検出されます)。

「設定ファイルゼロで動く」のが v4 の売りなので、古い記事の手順は完全に無視して大丈夫です。

## まとめ

今回ハマった6つのポイントを振り返ります。

- `pnpm create vite` はディレクトリのネストに注意
- Vite テンプレートの `App.css` import は不要なら消す
- Workers Assets と Hono を併用するなら `run_worker_first` を設定
- Workers Assets と Cloudflare Pages は別物、検索ワードに注意
- 初回デプロイ前に workers.dev サブドメインを登録
- Tailwind CSS v4 は設定ファイルゼロ、古い記事を信じない

特に Workers Assets まわりと Tailwind v4 まわりは、情報の鮮度が大事だなと感じました。エコシステムの変化が速い領域では、公式ドキュメントを優先的に読むクセをつけるのが結局一番の近道です。

同じ構成にチャレンジする方の参考になれば嬉しいです。

インストールから本番デプロイまでの手順をまとめた手順書は、姉妹記事「Cloudflare Workers + Hono + React + D1 + Drizzle ORM のセットアップ手順書」として別記事で公開しています。こちらも合わせてどうぞ。

## 参考リンク

- Cloudflare Workers 公式: https://developers.cloudflare.com/workers/
- Cloudflare D1 公式: https://developers.cloudflare.com/d1/
- Workers Assets 公式: https://developers.cloudflare.com/workers/static-assets/
- Hono 公式: https://hono.dev/
- Drizzle ORM 公式: https://orm.drizzle.team/
- Tailwind CSS v4 公式: https://tailwindcss.com/docs/installation/using-vite
- Vite 公式: https://vite.dev/
