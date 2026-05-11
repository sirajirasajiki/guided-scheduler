# Plan: React Router v7 → TanStack Router 移行 (Issue #16)

> **使用モデル**: Claude Sonnet 4.6 (`claude-sonnet-4-6`)

## Context

React Router v7 に CVE-2025-31137 の脆弱性が報告されたことを受け、将来の拡張基盤として型安全・ファイルベースルーティングが特長の TanStack Router に移行する。現プロジェクトへの直接影響はないが、型安全性向上と技術的負債の解消を目的として実施する。

---

## 現状の React Router 使用箇所

| ファイル | 使用 API | 用途 |
|--------|---------|------|
| App.tsx | `BrowserRouter`, `Routes`, `Route` | ルート定義 |
| admin.tsx | `useParams` | `adminToken` 取得 |
| event.tsx | `useParams` | `shareToken` 取得 |
| footer.tsx | `useLocation`, `Link` + `state` | 遷移元パスを state で渡す |
| terms.tsx | `useLocation`, `Link` | `location.state.from` で戻り先取得 |
| privacy.tsx | `useLocation`, `Link` | 同上 |
| faq.tsx | `useLocation`, `Link` | 同上 |

---

## 方針

- **ファイルベースルーティング**を採用（TanStack Router Vite プラグイン使用）
- `src/client/pages/` を廃止し `src/client/routes/` に移行（TanStack Router の慣習に合わせる）
- **「← 戻る」の `location.state` → Search Params に移行**（型安全化）
- `App.tsx` は削除し、`main.tsx` で `RouterProvider` を直接レンダリング

---

## パッケージ変更

```
pnpm remove react-router-dom
pnpm add @tanstack/react-router
pnpm add -D @tanstack/router-vite-plugin
```

---

## 変更ファイル一覧

### 変更

| ファイル | 変更内容 |
|--------|--------|
| `vite.config.ts` | `TanStackRouterVite()` プラグインを追加 |
| `src/client/main.tsx` | `<App />` → `<RouterProvider router={router} />` |

### 新規作成

| ファイル | 説明 |
|--------|------|
| `src/client/routes/__root.tsx` | ルートレイアウト（`div.min-h-screen` ラッパー） |
| `src/client/routes/index.tsx` | `/` → create-event.tsx の内容を移植 |
| `src/client/routes/admin.$adminToken.tsx` | `/admin/$adminToken` → admin.tsx の内容を移植 |
| `src/client/routes/event.$shareToken.tsx` | `/event/$shareToken` → event.tsx の内容を移植 |
| `src/client/routes/terms.tsx` | `/terms` → terms.tsx の内容を移植 |
| `src/client/routes/privacy.tsx` | `/privacy` → privacy.tsx の内容を移植 |
| `src/client/routes/faq.tsx` | `/faq` → faq.tsx の内容を移植 |
| `src/client/router.ts` | `createRouter` でルーターインスタンスを生成 |
| `src/client/routeTree.gen.ts` | Vite プラグインが自動生成（コミット対象） |

### 削除

| ファイル | 理由 |
|--------|------|
| `src/client/App.tsx` | ルーティングを routes/ に移管するため不要 |
| `src/client/pages/create-event.tsx` | routes/index.tsx に移植 |
| `src/client/pages/admin.tsx` | routes/admin.$adminToken.tsx に移植 |
| `src/client/pages/event.tsx` | routes/event.$shareToken.tsx に移植 |
| `src/client/pages/terms.tsx` | routes/terms.tsx に移植 |
| `src/client/pages/privacy.tsx` | routes/privacy.tsx に移植 |
| `src/client/pages/faq.tsx` | routes/faq.tsx に移植 |

---

## API 置き換えマッピング

| React Router | TanStack Router | 備考 |
|-------------|----------------|------|
| `BrowserRouter` + `Routes` + `Route` | `createFileRoute` + Vite プラグイン自動生成 | |
| `useParams` | `Route.useParams()` | 各ルートファイルの `Route` から呼ぶ |
| `Link` | `Link` from `@tanstack/react-router` | |
| `useLocation` | `useRouterState` | 現在パスの取得 |
| `Link state={{ from }}` | `Link search={{ from }}` | Search Params に変更 |
| `location.state?.from` | `Route.useSearch().from` | 型安全な Search Params |

---

## 「← 戻る」の移行詳細

### footer.tsx（変更前）
```tsx
<Link to="/terms" state={{ from: location.pathname }}>利用規約</Link>
```

### footer.tsx（変更後）
```tsx
<Link to="/terms" search={{ from: location.pathname }}>利用規約</Link>
```

### terms.tsx（変更前）
```tsx
const location = useLocation();
const backTo = (location.state as { from?: string } | null)?.from ?? "/";
```

### terms.tsx（変更後）
```tsx
const { from } = Route.useSearch();
const backTo = from ?? "/";
```

各ルートの `createFileRoute` に `validateSearch` を設定して型安全に:
```ts
export const Route = createFileRoute('/terms')({
  validateSearch: (search: Record<string, unknown>) => ({
    from: typeof search.from === 'string' ? search.from : undefined,
  }),
  component: TermsPage,
})
```

---

## 実装順序

1. `vite.config.ts` に TanStack Router Vite プラグインを追加
2. `src/client/routes/__root.tsx` を作成
3. 各ルートファイル（index, admin, event, terms, privacy, faq）を作成
4. `src/client/router.ts` を作成
5. `src/client/main.tsx` を更新
6. 旧ファイル（App.tsx, pages/）を削除
7. `pnpm remove react-router-dom && pnpm add @tanstack/react-router`
8. `pnpm typecheck` で型エラーがないか確認

---

## 動作確認

```
pnpm dev
```

- `/` : イベント作成フォームが表示される
- `/admin/:adminToken` : 存在するトークンで管理画面が表示される
- `/event/:shareToken` : 存在するトークンで回答フォームが表示される
- `/terms`, `/privacy`, `/faq` : ページが表示され「← 戻る」が遷移元に戻れる
- フッターの各リンクをクリック → 静的ページに遷移 → 「← 戻る」で戻れる
- `pnpm typecheck` がエラーなし

---

## 注意事項

- `routeTree.gen.ts` は Vite プラグインが自動生成するため、手動編集しない
- `src/` 配下に `localhost` / `debugger` を記述しないこと（CI でブロックされる）
