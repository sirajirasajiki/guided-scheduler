# React Router v7 → TanStack Router 一括移行プラン (Issue #16)

> Model: claude-opus-4-7

## Context

GitHub Issue [#16](https://github.com/sirajirasajiki/guided-scheduler/issues/16) のタスク。

- **動機**: 将来このプロジェクトをベースに別アプリを作る際の基盤整備。React Router v7 の CVE-2025-31137 (SSR + ミドルウェア時のパストラバーサル) は本プロジェクト (SPA、SSR 非使用) には直接の影響なし。型安全・ファイルベースルーティング・Vite 親和性を理由に TanStack Router へ寄せる。
- **完了条件**: 全 6 ルート (`/`, `/admin/:adminToken`, `/event/:shareToken`, `/terms`, `/privacy`, `/faq`) が動作し、Footer の「← 戻る」リンクが遷移元に正しく戻れる。
- **方針 (ユーザー確認済み)**:
  1. **ファイルベースルーティング** (`@tanstack/router-plugin/vite` で `routeTree.gen.ts` 自動生成)
  2. **Search Params で「from」を保持** (URL に `?from=/` として現れる、Zod でバリデーション)
  3. **一括移行** (1 つの PR で `react-router-dom` を完全削除)

---

## 現状サマリ

### 依存関係
- `react-router-dom`: `^7.14.0` ([package.json:25](../../../package.json#L25))
- React 19.2.4、Vite 8、Tailwind v4
- Zod は **未導入** (新規追加が必要)

### 既存ルート定義 ([src/client/App.tsx](../../../src/client/App.tsx))
```
BrowserRouter
└─ <main className="flex-1 flex flex-col">
   ├─ /                    → CreateEvent
   ├─ /admin/:adminToken   → Admin       (useParams で adminToken 取得)
   ├─ /event/:shareToken   → Event       (useParams で shareToken 取得)
   ├─ /terms               → Terms       (useLocation().state.from で戻り先取得)
   ├─ /privacy             → Privacy     (同上)
   └─ /faq                 → Faq         (同上)
```

### React Router 依存箇所 (7 ファイル)
- [src/client/App.tsx](../../../src/client/App.tsx) — BrowserRouter, Routes, Route
- [src/client/pages/admin.tsx](../../../src/client/pages/admin.tsx) L21 — `useParams<{ adminToken: string }>()`
- [src/client/pages/event.tsx](../../../src/client/pages/event.tsx) L21 — `useParams<{ shareToken: string }>()`
- [src/client/components/footer.tsx](../../../src/client/components/footer.tsx) — `Link`, `useLocation`、`state={{ from: pathname }}` を渡す
- [src/client/pages/terms.tsx](../../../src/client/pages/terms.tsx) L1, L4-5 — `Link`, `useLocation`、`(location.state as { from?: string } | null)?.from ?? "/"`
- [src/client/pages/privacy.tsx](../../../src/client/pages/privacy.tsx) — 同上
- [src/client/pages/faq.tsx](../../../src/client/pages/faq.tsx) — 同上

`useNavigate` は未使用、検索パラメータも未使用。

### サーバー / ビルド
- SPA。Cloudflare Workers + Hono バックエンド (`/api/*`)、Workers Assets で `dist/client` を配信
- `wrangler.toml` の `not_found_handling = "single-page-application"` により、未マッチのパスは `index.html` を返す
- `pnpm dev` は **`wrangler dev --env dev`** (vite dev サーバーではない)
- `pnpm build` は `vite build`
- → **`routeTree.gen.ts` は `vite build` または `vite` (devサーバー単独実行) で生成される**。最初の dev 起動前にビルドが必要。

---

## 公式ドキュメントから確認した事実

実装着手時に再確認すべき (CLAUDE.md「推測で書かない」):

- **Vite プラグインは `tanstackRouter()` を `react()` より前に置く** (公式に明示)
- **devtools のパッケージ名**: `@tanstack/react-router-devtools` (× `@tanstack/router-devtools`)
- **デフォルト**: `routesDirectory = ./src/routes`、`generatedRouteTree = ./src/routeTree.gen.ts` → 本プロジェクトでは `src/client/routes/` に置きたいので **プラグイン設定で上書き**
- **動的セグメント記法**: `admin.$adminToken.tsx` (フラット記法)
- **`createRouter` の Register 型登録**: `declare module '@tanstack/react-router' { interface Register { router: typeof router } }`
- **Search Params 検証**: Zod v4 ならスキーマを `validateSearch` に直接渡せる。`.catch(value)` で検証失敗時のフォールバックを定義可能 (errorComponent に飛ばさず黙って既定値で復帰)
- **Workers Runtime 互換**: TanStack Router はクライアント側のみ。Worker (Hono) には影響しない。Vite プラグインはビルド時のみ動作する

実装直前に `pnpm view @tanstack/react-router version` などで最新版を確認し、その時点の最新を pin する (CLAUDE.md「バージョンは執筆時点の最新を使う」)。

---

## ファイル変更一覧

### 新規作成
| パス | 役割 |
| --- | --- |
| `src/client/routes/__root.tsx` | ルートレイアウト (`min-h-screen flex flex-col` + `<main>` を移管) + dev のみ devtools |
| `src/client/routes/index.tsx` | `/` → CreateEvent |
| `src/client/routes/admin.$adminToken.tsx` | `/admin/:adminToken` → Admin |
| `src/client/routes/event.$shareToken.tsx` | `/event/:shareToken` → Event |
| `src/client/routes/terms.tsx` | `/terms`、`validateSearch` で `from` を Zod バリデーション |
| `src/client/routes/privacy.tsx` | 同上 |
| `src/client/routes/faq.tsx` | 同上 |
| `src/client/lib/back-link-search.ts` | `from` の Zod スキーマと型を共通化 |
| `src/client/routeTree.gen.ts` | プラグインが自動生成 (手で書かない) |

### 修正
| パス | 修正内容 |
| --- | --- |
| `vite.config.ts` | `tanstackRouter` プラグインを `react()` の前に追加。`routesDirectory: 'src/client/routes'`, `generatedRouteTree: 'src/client/routeTree.gen.ts'` |
| `src/client/main.tsx` | `App` を捨て `createRouter` + `RouterProvider` に置換、`declare module` で型登録 |
| `src/client/components/footer.tsx` | `react-router-dom` の `Link`/`useLocation` を TanStack Router 版に置換、`search={{ from: pathname }}` を渡す |
| `src/client/pages/admin.tsx` | `useParams` 削除。Props で `adminToken: string` を受け取る形にリファクタ。L29 の `if (!adminToken)` ガード等は不要になる |
| `src/client/pages/event.tsx` | 同上 (`shareToken: string` を Props に) |
| `src/client/pages/terms.tsx` | `useLocation` 削除。Props で `from: string` を受け取る。`Link` を TanStack Router 版に |
| `src/client/pages/privacy.tsx` | 同上 |
| `src/client/pages/faq.tsx` | 同上 |
| `package.json` | 依存関係差し替え (下記) |
| `.gitignore` | `src/client/routeTree.gen.ts` を追加 |

### 削除
| パス | 理由 |
| --- | --- |
| `src/client/App.tsx` | BrowserRouter / Routes ごと不要に。`<main>` 等の共通レイアウトは `__root.tsx` に移管 |

### `pages/` ディレクトリは残す
ロジック層 (Props を受ける純粋なコンポーネント) と routing 層 (`routes/`) を分離する。
- `pages/*.tsx` は `useParams` / `useLocation` を持たず、Props だけで動く形にリファクタ
- `routes/*.tsx` は `Route.useParams()` / `Route.useSearch()` で値を引いて `pages/*.tsx` を呼び出す
- 既存ページ本体の JSX 改変はほぼゼロ

---

## 依存関係の変更

```bash
# 削除
pnpm remove react-router-dom

# 追加
pnpm add @tanstack/react-router zod
pnpm add -D @tanstack/react-router-devtools @tanstack/router-plugin
```

`zod` は本リポジトリに未導入だが、search params 検証で利用するため新規追加。CLAUDE.md「新規ライブラリ追加は事前相談」に該当 — **着手前に Fujiki に確認**。

Workers Runtime 互換: TanStack Router はクライアント JS なので Worker サーバー側には影響しない。Zod もクライアント側のみで使用。問題なし。

---

## 主要実装ポイント

### `vite.config.ts`
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "src/client/routes",
      generatedRouteTree: "src/client/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
  ],
  build: { outDir: "dist/client", emptyOutDir: true },
});
```

### `src/client/main.tsx`
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "./index.css";

const router = createRouter({ routeTree, defaultPreload: "intent" });

declare module "@tanstack/react-router" {
  interface Register { router: typeof router }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
```

### `src/client/routes/__root.tsx`
`App.tsx` の `<div className="min-h-screen flex flex-col"><main className="flex-1 flex flex-col">` をここに移管。devtools は dev のみ lazy load。

```tsx
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import("@tanstack/react-router-devtools").then((m) => ({
        default: m.TanStackRouterDevtools,
      })),
    );

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <Suspense>
        <TanStackRouterDevtools />
      </Suspense>
    </div>
  ),
});
```

### `src/client/lib/back-link-search.ts`
```ts
import { z } from "zod";

// "/" 始まりの内部パスのみ許可。外部URLや javascript: スキームを弾く。
export const backLinkSearchSchema = z.object({
  from: z
    .string()
    .regex(/^\/(?!\/)/)
    .default("/")
    .catch("/"),
});

export type BackLinkSearch = z.infer<typeof backLinkSearchSchema>;
```
`.catch("/")` が肝。検証失敗時に errorComponent に飛ばさず `from = "/"` で復帰する。

### `src/client/routes/index.tsx`
```tsx
import { createFileRoute } from "@tanstack/react-router";
import CreateEvent from "../pages/create-event";

export const Route = createFileRoute("/")({ component: CreateEvent });
```

### `src/client/routes/admin.$adminToken.tsx`
```tsx
import { createFileRoute } from "@tanstack/react-router";
import Admin from "../pages/admin";

export const Route = createFileRoute("/admin/$adminToken")({
  component: AdminRoute,
});

function AdminRoute() {
  const { adminToken } = Route.useParams();
  return <Admin adminToken={adminToken} />;
}
```
連動して `pages/admin.tsx` を `export default function Admin({ adminToken }: { adminToken: string })` に変更。`adminToken` は常に string になるので、L29 などの `if (!adminToken)` ガードと non-null assertion を削除できる。

### `src/client/routes/terms.tsx` (privacy / faq も同型)
```tsx
import { createFileRoute } from "@tanstack/react-router";
import Terms from "../pages/terms";
import { backLinkSearchSchema } from "../lib/back-link-search";

export const Route = createFileRoute("/terms")({
  validateSearch: backLinkSearchSchema,
  component: TermsRoute,
});

function TermsRoute() {
  const { from } = Route.useSearch();
  return <Terms from={from} />;
}
```
連動して `pages/terms.tsx` 側は `useLocation` 削除、`function Terms({ from }: { from: string })` で受ける。`<Link to={backTo}>` は `<Link to={from}>` に。

### `src/client/components/footer.tsx`
```tsx
import { Link, useRouterState } from "@tanstack/react-router";

export default function Footer() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <footer className="mt-6 py-3 text-center text-xs text-gray-400 space-x-4">
      <Link to="/terms" search={{ from: pathname }} className="hover:underline hover:text-gray-600">利用規約</Link>
      <Link to="/privacy" search={{ from: pathname }} className="hover:underline hover:text-gray-600">プライバシーポリシー</Link>
      <Link to="/faq" search={{ from: pathname }} className="hover:underline hover:text-gray-600">よくある質問</Link>
    </footer>
  );
}
```
TanStack Router の `Link` は `to` から `search` の型を推論するので `from: string` が型チェックされる。

### `.gitignore` 追記
```
# TanStack Router auto-generated route tree
src/client/routeTree.gen.ts
```
公式は必須としていないが、自動生成物のコミットは差分ノイズの元なので gitignore する。

---

## 実装順序

1. **依存関係差し替え**: `pnpm remove react-router-dom` → `pnpm add @tanstack/react-router zod` → `pnpm add -D @tanstack/react-router-devtools @tanstack/router-plugin`。Fujiki に Zod 追加の事前確認。
2. **`vite.config.ts` 編集** (プラグイン追加)
3. **`.gitignore` に `src/client/routeTree.gen.ts` を追加**
4. **`src/client/lib/back-link-search.ts` 作成**
5. **`pages/*.tsx` を Props ベースにリファクタ** (`react-router-dom` import を全部消す)
   - `create-event.tsx` は Router 未使用なので変更不要
   - `admin.tsx` / `event.tsx`: useParams を削除し Props 化
   - `terms.tsx` / `privacy.tsx` / `faq.tsx`: useLocation を削除し Props 化、`Link` の import 元を `@tanstack/react-router` に
6. **`src/client/routes/` 配下のルートファイル 6 + `__root.tsx` を作成**
7. **`components/footer.tsx` を TanStack Router 版に書換**
8. **`src/client/main.tsx` を `RouterProvider` に書換**
9. **`src/client/App.tsx` 削除**
10. **`pnpm build` を一度実行** (`routeTree.gen.ts` の初回生成)
11. **`pnpm typecheck` 実行 → エラーゼロを確認**
12. **`pnpm dev` で全 6 ルート手動確認** (検証セクション参照)

---

## 検証

| 項目 | 確認方法 | 期待結果 |
| --- | --- | --- |
| 型チェック | `pnpm typecheck` | エラーゼロ |
| `react-router-dom` 残骸 | Grep `react-router-dom` in `src/` | 0 件 |
| ビルド | `pnpm build` | 成功、`dist/client` 生成、`routeTree.gen.ts` 生成 |
| `localhost`/`127.0.0.1` チェック (CI) | Grep `127.0.0.1\|localhost` in `src/` | 0 件 |
| `debugger` 文 (CI) | Grep `debugger` in `src/` | 0 件 |
| `/` | `pnpm dev` でブラウザ確認 | CreateEvent 表示、Footer 表示 |
| `/admin/<token>` | 直アクセス | Admin 表示、API 呼び出し成功 |
| `/event/<token>` | 直アクセス | Event 表示 |
| Footer 戻るリンク (正常系) | `/` → Footer「利用規約」 → URL `/terms?from=%2F` → 「← 戻る」 | `/` に戻る |
| Footer 戻るリンク (admin から) | `/admin/<token>` → Footer「FAQ」 → 「← 戻る」 | `/admin/<token>` に戻る |
| 戻るリンクのフォールバック | `/terms` を search 無しで直アクセス | `from = "/"` がデフォルト適用、戻るリンクが `/` を指す |
| Zod バリデーション失敗時 | `/terms?from=https://evil.example` を直アクセス | `.catch("/")` で `from = "/"` にフォールバック (errorComponent に飛ばない) |
| プライバシー / FAQ も同様 | 上記を `/privacy`, `/faq` で繰り返し | 同様に動作 |

---

## リスク・注意点

1. **プラグイン順序**: `tanstackRouter()` は必ず `react()` より前。逆だと型生成・HMR が壊れる。
2. **`routeTree.gen.ts` の初回生成**: dev サーバー起動か `vite build` が走らないと生成されない。`pnpm dev` (= `wrangler dev`) は wrangler 経由なので、**実装後の最初は `pnpm build` を一度走らせて生成する**手順をフローに含める。
3. **Zod のバージョン**: 公式ドキュメントは Zod v4 で `validateSearch: schema` 直接渡しが可能とする。v3 が入った場合は `@tanstack/zod-adapter` の `zodValidator()` で wrap が必要。`pnpm add zod` 後に `pnpm view zod version` でバージョン確認し、v4 系であることを担保。
4. **`Link to={from}` の型**: `from` は動的 string。TanStack Router の `Link` は文字列リテラル URL を受け付けるので、`<Link to={from}>` のままで動く (内部的には `navigate({ to: from })` 相当)。型エラーが出る場合は `Link` の代わりに `<Link to={from as string}>` ではなく `params`/`search` の型を素直に流す。
5. **CreateEvent 内の `<a>` タグ**: [src/client/pages/create-event.tsx](../../../src/client/pages/create-event.tsx) L102, L175, L176 などで `<a href="...">` が使われている (フルリロード)。**今回のスコープ外**。Issue #16 はルーター入れ替えが目的なので触らない。
6. **terms.tsx 内の hardcoded production URL** ([terms.tsx:161](../../../src/client/pages/terms.tsx#L161)): `https://guided-scheduler.sirajira.workers.dev/privacy` への外部リンク。CLAUDE.md は `localhost`/`127.0.0.1` を禁止しているが、production URL は規制対象外。今回は変更不要。
7. **CLAUDE.md のコメント注意**: `localhost` という単語をコメントにも書けない。`__root.tsx` 等にコメントを書くなら「ローカル環境」「開発サーバー」等の日本語表現を使う。
8. **Footer 配置ルール**: CLAUDE.md より、`<Footer />` は各ページが import する。`__root.tsx` に Footer を置かないこと。`terms`/`privacy`/`faq` は「行き止まりページ」なので Footer なしで現状維持。
9. **`erasableSyntaxOnly` (tsconfig.app.json)**: `declare module` は型のみで erasable なので問題なし。
10. **HMR**: `routes/` 配下の追加・削除はプラグインが監視して自動再生成。ファイル名 typo (例: `admin.adminToken.tsx` のように `$` を忘れる) は静的ルート扱いになり `/admin/:adminToken` がマッチしない → 起動時に再確認。

---

## 着手前に Fujiki に確認すべき項目

1. **新規ライブラリ `zod` 追加の承認** (CLAUDE.md「新規ライブラリの追加は事前相談」)
2. **`routeTree.gen.ts` を gitignore する方針で OK か** (公式は必須にしていない。コミットしてレビューに乗せる流派もある)
