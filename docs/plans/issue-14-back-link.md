# Fix: 「← 戻る」リンクが常に / に戻るバグ (Issue #14)

## Context

利用規約・プライバシーポリシー・FAQ ページの「← トップに戻る」リンクが、
遷移元に関わらず常に `/` に固定されている。

**根本原因**: 3ページとも `<Link to="/">← トップに戻る</Link>` でハードコードされている。

**設計方針**:
- フッターを terms/privacy/faq に表示しないことで、ページ間チェーン遷移の問題を根本回避
- 全リンクを `<Link state={{ from: location.pathname }}>` に統一（SPAとして自然）
- 遷移元は React Router の location state で引き渡す

## 変更ファイルと修正内容

### 1. `src/client/App.tsx`

`useLocation` で現在パスを取得し、terms/privacy/faq では Footer を非表示にする。

```tsx
const location = useLocation();
const hideFooter = ['/terms', '/privacy', '/faq'].includes(location.pathname);

// ...
{!hideFooter && <Footer />}
```

※ `useLocation` を使うため、`<BrowserRouter>` の内側で呼ぶ必要があることに注意。
  App.tsx の構造によっては useLocation の呼び出し位置の調整が必要。

### 2. `src/client/components/footer.tsx`

- `useLocation` をインポート
- `/terms`・`/privacy` の `<a href target="_blank">` を `<Link>` に変更
- 3リンク全てに `state={{ from: location.pathname }}` を追加

```tsx
import { Link, useLocation } from 'react-router-dom';

// コンポーネント内
const location = useLocation();

<Link to="/terms" state={{ from: location.pathname }}>利用規約</Link>
<Link to="/privacy" state={{ from: location.pathname }}>プライバシーポリシー</Link>
<Link to="/faq" state={{ from: location.pathname }}>よくある質問</Link>
```

### 3. `src/client/pages/terms.tsx`

- `useLocation` をインポート（`Link` は既存）
- `location.state?.from ?? '/'` を戻り先に使用
- ボタンテキストを「← トップに戻る」→「← 戻る」に変更

```tsx
import { Link, useLocation } from 'react-router-dom';

const location = useLocation();
const backTo = (location.state as { from?: string } | null)?.from ?? '/';

<Link to={backTo} className="text-sm text-blue-600 hover:underline">
  ← 戻る
</Link>
```

### 4. `src/client/pages/privacy.tsx`

- terms.tsx と同じ修正を適用

### 5. `src/client/pages/faq.tsx`

- terms.tsx と同じ修正を適用

## 検証方法

`pnpm dev` でローカル起動後、以下を確認する。

| 操作 | 期待する戻り先 |
|------|--------------|
| 管理ページ → 利用規約 → 「← 戻る」 | `/admin/:adminToken` |
| 管理ページ → プライバシーポリシー → 「← 戻る」 | `/admin/:adminToken` |
| 管理ページ → よくある質問 → 「← 戻る」 | `/admin/:adminToken` |
| イベントページ → 利用規約 → 「← 戻る」 | `/event/:shareToken` |
| イベントページ → FAQ → 「← 戻る」 | `/event/:shareToken` |
| 直接 `/terms` にアクセス → 「← 戻る」 | `/` |
| 直接 `/faq` にアクセス → 「← 戻る」 | `/` |
| terms/privacy/faq ページでフッターが表示されていないこと | — |
