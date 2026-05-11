# Issue #16: React Router → TanStack Router 移行計画

## Context

React Router v7 に CVE-2025-31137（SSR + ミドルウェア使用時のパストラバーサル脆弱性）が報告されたことと、将来の別アプリ開発に向けた基盤整備として TanStack Router への移行を行う。

現プロジェクトへの直接的な影響はないが、TanStack Router の完全な型安全性・Vite との親和性・ファイルベースルーティングの利点を活かすための移行。

---

## 現状の React Router 使用箇所

| ファイル | 使用 API |
|---|---|
| `src/client/App.tsx` | `BrowserRouter`, `Routes`, `Route` |
| `src/client/pages/admin.tsx` | `useParams` |
| `src/client/pages/event.tsx` | `useParams` |
| `src/client/pages/terms.tsx` | `Link`, `useLocation` (location.state.from) |
| `src/client/pages/privacy.tsx` | `Link`, `useLocation` (location.state.from) |
| `src/client/pages/faq.tsx` | `Link`, `useLocation` (location.state.from) |
| `src/client/components/footer.tsx` | `Link`, `useLocation` (state 送信側) |

「← 戻る」の仕組み：footer.tsx が `state={{ from: location.pathname }}` を Link で渡し、terms/privacy/faq が `location.state.from` を読み取って戻り先として使う。

---

## 移行アプローチ

### ルーター設定：コードベースルーティング

6ルートのみの小規模アプリのため、ファイルベースルーティング（@tanstack/router-plugin）は不要。コードベースで App.tsx に一括定義する。

### 「← 戻る」：Search Params に移行

TanStack Router の型安全な Search Params を使う（issue の推奨通り）。

- **送信側（footer.tsx）**: `<Link to="/terms" search={{ from: pathname }}>`
- **受信側（terms/privacy/faq）**: `useSearch({ from: '/terms' })` で `from` を取得
- **戻るリンク**: `<Link href={from ?? '/'}>← 戻る</Link>` （TanStack Router の href でクライアントサイドナビゲーション）

---

## 実装ステップ

### Step 1: パッケージ入れ替え

```bash
pnpm remove react-router-dom
pnpm add @tanstack/react-router
```

### Step 2: App.tsx 書き換え

`src/client/App.tsx` — `BrowserRouter/Routes/Route` を TanStack Router の構成に置き換える。

```tsx
import { createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'

const rootRoute = createRootRoute()

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: CreateEvent,
})

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/$adminToken',
  component: Admin,
})

const eventRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/event/$shareToken',
  component: Event,
})

// Search Params のバリデーション定義
const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/terms',
  validateSearch: (search: Record<string, unknown>) => ({
    from: typeof search.from === 'string' ? search.from : undefined,
  }),
  component: Terms,
})

// privacy, faq も同様

const routeTree = rootRoute.addChildren([
  indexRoute, adminRoute, eventRoute, termsRoute, privacyRoute, faqRoute,
])

const router = createRouter({ routeTree })

// 型登録（型安全のため必須）
declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}

export default function App() {
  return <RouterProvider router={router} />
}
```

### Step 3: admin.tsx — useParams 移行

```tsx
// Before
import { useParams } from 'react-router-dom'
const { adminToken } = useParams<{ adminToken: string }>()

// After
import { useParams } from '@tanstack/react-router'
const { adminToken } = useParams({ from: '/admin/$adminToken' })
```

### Step 4: event.tsx — useParams 移行

```tsx
// Before
import { useParams } from 'react-router-dom'
const { shareToken } = useParams<{ shareToken: string }>()

// After
import { useParams } from '@tanstack/react-router'
const { shareToken } = useParams({ from: '/event/$shareToken' })
```

### Step 5: footer.tsx — Link + useLocation 移行

```tsx
// Before
import { Link, useLocation } from 'react-router-dom'
const location = useLocation()
<Link to="/terms" state={{ from: location.pathname }}>利用規約</Link>

// After
import { Link, useRouterState } from '@tanstack/react-router'
const pathname = useRouterState({ select: (s) => s.location.pathname })
<Link to="/terms" search={{ from: pathname }}>利用規約</Link>
```

### Step 6: terms.tsx / privacy.tsx / faq.tsx — useLocation.state 移行

```tsx
// Before
import { Link, useLocation } from 'react-router-dom'
const location = useLocation()
const backTo = (location.state as { from?: string } | null)?.from ?? '/'
<Link to={backTo}>← 戻る</Link>

// After
import { Link, useSearch } from '@tanstack/react-router'
const { from } = useSearch({ from: '/terms' })  // /privacy, /faq それぞれ
const backTo = from ?? '/'
<Link href={backTo}>← 戻る</Link>
```

---

## 変更対象ファイル一覧

| ファイル | 変更内容 |
|---|---|
| `package.json` | `react-router-dom` 削除、`@tanstack/react-router` 追加 |
| `src/client/App.tsx` | ルーター定義を全面書き換え |
| `src/client/pages/admin.tsx` | `useParams` import を変更 |
| `src/client/pages/event.tsx` | `useParams` import を変更 |
| `src/client/pages/terms.tsx` | `Link` + `useSearch` に変更 |
| `src/client/pages/privacy.tsx` | 同上 |
| `src/client/pages/faq.tsx` | 同上 |
| `src/client/components/footer.tsx` | `Link` + `useRouterState` に変更 |

`src/client/main.tsx`、`src/client/lib/api.ts`、`src/server/` 配下は変更なし。

---

## 注意事項

- `window.location.origin`（create-event.tsx）と `window.location.href`（admin.tsx）はブラウザネイティブ API のため変更不要
- 生の `<a>` タグ（create-event.tsx 内の管理ページリンク、terms/privacy の target="_blank" リンク）は変更不要
- TanStack Router のルートパラメータは `:adminToken` ではなく `$adminToken` の記法を使う

---

## 検証方法

1. `pnpm typecheck` — TypeScript 型エラーがないことを確認
2. `pnpm dev` でローカル起動し、全ルートを手動確認：
   - `/` → イベント作成フォームが表示される
   - `/admin/:adminToken` → 管理画面が表示される（管理URLからアクセス）
   - `/event/:shareToken` → 参加者回答画面が表示される（共有URLからアクセス）
   - `/terms`, `/privacy`, `/faq` → 各ページが表示され、「← 戻る」が遷移元に戻れる
   - フッターの各リンク → 正しく遷移でき、戻るリンクが機能する
3. 直接URL入力でのアクセスでも正常に動作することを確認
