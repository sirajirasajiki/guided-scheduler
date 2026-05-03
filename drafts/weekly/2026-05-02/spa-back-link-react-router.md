---
title: "「戻る」リンクを直すだけのつもりが、SPA設計を3回見直すことになった話"
slug: "spa-back-link-react-router"
status: "draft"
source_dates:
  - "2026-05-03"
tags:
  - "React"
  - "React Router"
  - "SPA"
  - "フロントエンド"
seo_title: "React RouterのSPAで「前のページに戻る」を実装する設計判断"
keywords: "React Router, location.state, SPA, 戻るボタン, document.referrer, フッター設計"
meta:
  description_candidates:
    - "React RouterのSPAで「前のページに戻る」を実装しようとしたら、document.referrer vs location.state、フッター設計、グローバルレイアウトの限界という4つの設計判断に直面した記録。"
    - "「← トップに戻る」が常にトップに戻るバグを直しながら気づいたSPAナビゲーション設計のポイントを解説。"
    - "バグ修正1件でReact RouterのSPA設計を見直した実録。location.stateの使い方から「行き止まりページ」の設計まで。"
---

# 「戻る」リンクを直すだけのつもりが、SPA設計を4回見直すことになった話

こんにちは、白々さじきです。

飲み会の日程調整ツールをCloudflare Workers + Hono + D1で作るこの検証プロジェクト。今回はGitHub Issueで見つけた「← トップに戻る」バグの修正に取り組みました。

バグ自体はシンプルに見えました。**1行直せば終わる**、そう思っていました。

実際には4つの設計判断が連鎖し、8ファイルの変更になりました。

---

## バグの概要：なぜ常にトップに戻るのか

このツールには利用規約・プライバシーポリシー・FAQの3ページがあります。各ページの上部に「← トップに戻る」リンクがあるのですが、どこから来ても常に `/`（イベント作成ページ）に飛んでしまいます。

```tsx
// 3ページ全てに同じコードが書かれていた
<Link to="/" className="text-sm text-blue-600 hover:underline">
  ← トップに戻る
</Link>
```

管理ページから利用規約を開いたら、管理ページに戻りたい。イベントページから来たら、そちらに戻りたい。それが普通の動作です。

**そしてこれは、初回実装（Claude Code完全委任）では気づかなかった問題です。**

利用規約ページを作るとき、「どこから来るか」を意識していませんでした。「作って終わり」になっていた。Claude Codeへの完全委任では、こういう「遷移元を考慮した動作」が抜けやすいです。これがまさに検証プロジェクトで観測したかった「理解負債」の一形態でした。

---

## 調査：フッターリンクに2種類混在していた

修正を始める前に既存コードを調べると、フッターのリンク実装が2種類混在していました。

```tsx
// footer.tsx
<a href="/terms" target="_blank" rel="noopener noreferrer">
  利用規約
</a>
<a href="/privacy" target="_blank" rel="noopener noreferrer">
  プライバシーポリシー
</a>
<Link to="/faq">
  よくある質問
</Link>
```

利用規約とプライバシーポリシーは `<a target="_blank">` で**新しいタブ**で開く。FAQは `<Link>` でSPA内遷移。この違いが、実装方法の選択に影響します。

---

## 設計判断①：document.referrer か location.state か

フッターに `<a target="_blank">` があったため、「新しいタブで開く遷移元をどう取得するか」という文脈で `document.referrer` が候補に上がりました。

[`document.referrer`](https://developer.mozilla.org/ja/docs/Web/API/Document/referrer) はブラウザ組み込みのプロパティで、「今のページを開く直前にいたページのURL」が入ります。仕組みはHTTPの [`Referer` ヘッダー](https://developer.mozilla.org/ja/docs/Web/HTTP/Reference/Headers/Referer)で、ブラウザがページを読み込む際に自動で付与します。新しいタブで開く場合は新しいHTTPリクエストが発生するため、`document.referrer` に正しくリンク元URLが入ります。

```tsx
// document.referrerを使う場合
const backUrl = (() => {
  if (!document.referrer) return '/';
  const ref = new URL(document.referrer);
  if (ref.origin === window.location.origin) return ref.pathname;
  return '/';
})();
```

しかし **SPA内遷移（`<Link>`）では `document.referrer` は空になります**。

`<Link>` はHTTPリクエストを発生させず、JavaScriptで画面を書き換えるだけです。ブラウザ側は「ページ遷移した」と認識しないため `Referer` ヘッダーを送らず、`document.referrer` は更新されません。FAQのようにSPA内遷移するページでは使えないとわかりました。（参照：[React Router `<Link>`](https://react-router-docs-ja.techtalk.jp/api/components/Link) ※非公式日本語訳）

React Routerにはこういったケース向けの機能があります。`<Link>` に `state` を渡せば、遷移先で [`useLocation()`](https://react-router-docs-ja.techtalk.jp/api/hooks/useLocation)（非公式日本語訳）から読み取れます。

```tsx
// リンク側（footer.tsx）
<Link to="/faq" state={{ from: location.pathname }}>
  よくある質問
</Link>

// 遷移先（faq.tsx）
const location = useLocation();
const backTo = (location.state as { from?: string } | null)?.from ?? '/';
```

`state.from` が未設定（直接アクセス）の場合は `'/'` にフォールバックする。これで要件を満たせます。

**教訓：`document.referrer` はSPA遷移（`<Link>`）では使えない。React RouterではLocation stateを使う。**

---

## 設計判断②：フッターリンクを \<Link\> に統一する

`document.referrer` が使えないとわかった時点で、「では `<a target="_blank">` と `<Link>` の2種類を使い分けて実装するか」という選択肢が生まれます。

- 利用規約・プライバシーポリシー（新タブ）→ `document.referrer` で対応
- FAQ（SPA遷移）→ `location.state` で対応

しかしここで一般的なSPAの慣習を確認しました。**SPA内のページへのリンクに `<a href>` を使うのは慣習に反する**のです。

`<a href>` はフルページリロードを引き起こします。新しいタブで開く場合も、開いた先のページはSPAの文脈から切り離されます。同じアプリ内のページへのリンクには基本的に `<Link>` を使うべきです。

利用規約・プライバシーポリシーを「別タブで開きたい」という意図があったのかもしれませんが、SPA設計として不自然でした。

フッターの3リンクをすべて `<Link state={{ from: location.pathname }}>` に統一しました。

```tsx
// 統一後のfooter.tsx
const location = useLocation();

<Link to="/terms" state={{ from: location.pathname }}>利用規約</Link>
<Link to="/privacy" state={{ from: location.pathname }}>プライバシーポリシー</Link>
<Link to="/faq" state={{ from: location.pathname }}>よくある質問</Link>
```

**教訓：SPA内のページへのリンクは外部リンクでない限り `<Link>` を使う。`<a href target="_blank">` はSPA内ページには使わない。**

---

## 設計判断③：「行き止まりページ」のフッターを消す

`<Link>` に統一したところで、新たな問題が見えてきました。

フッターは全ページに表示されています。つまり利用規約ページにも「プライバシーポリシー」「FAQ」へのリンクが表示されています。

- 管理ページ → 利用規約：`state.from = '/admin/abc123'`
- 利用規約 → プライバシーポリシー：`state.from = '/terms'`（フッターの `location.pathname` は `/terms`）
- プライバシーポリシーの「← 戻る」→ `/terms` へ戻る ✓
- `/terms` の「← 戻る」→ `state.from` がない（直接遷移と見なされる）→ `/` へ ✗

1ホップ前には正しく戻れますが、2ホップ以上渡り歩くと元のページの情報が失われます。

これを解消するにはページ間で `from` を引き継ぐ仕組みが必要になりますが、実装が複雑になります。

ここで発想を変えました。**そもそも利用規約・プライバシーポリシー・FAQのフッターを消せばいい。**

GitHub・Stripe・Notionなど一般的なサービスを見ると、利用規約やプライバシーポリシーのページにはナビゲーションフッターがありません。これらは「読んで戻るだけ」の行き止まりページです。ユーザーがここから別の法的ページに移動することは稀で、移動するとしても閲覧が目的です。

フッターを消すことで、チェーン遷移の問題を根本から消滅させました。

```tsx
// App.tsx でルートベースの条件分岐（後にさらに変更）
const HIDE_FOOTER_PATHS = ["/terms", "/privacy", "/faq"];
const hideFooter = HIDE_FOOTER_PATHS.includes(location.pathname);
{!hideFooter && <Footer />}
```

**教訓：ユーザーが「読んで戻る」だけのページにはナビゲーションを置かない。フッターリンクを消すことが設計上正しいこともある。**

---

## 設計判断④：App.tsx から Footer を外してページ管理に移す

ここまでで利用規約・プライバシーポリシー・FAQのフッター問題は解決しました。

しかし今度は別の問題が浮かんできました。回答送信後のサンクスページです。

このツールでは `/event/:shareToken`（回答フォーム）でフォームを送信すると、同じルートのまま `submitted` stateが `true` になり、「回答を送信しました ✅」という画面に切り替わります。

```tsx
// event.tsx内の条件分岐
if (submitted) {
  return (
    <div>
      <h2>回答を送信しました</h2>
      <p>ご協力ありがとうございます</p>
    </div>
  );
}
// ... 通常のフォーム
```

このサンクス画面にフッターが表示されていると、利用規約を開いて「← 戻る」を押すと、フォームページに戻ってしまいます（`state.from = '/event/:shareToken'` なので）。

**問題は、`/event/:shareToken` というルートは同じなのに、フォーム表示とサンクス表示でフッターの出し分けが必要という点です。**

App.tsx のルートベース除外（`HIDE_FOOTER_PATHS`）では、同じルートのサブ状態を見分けられません。

解決策はシンプルでした。**Footer を App.tsx から外して、各ページコンポーネントが直接持つようにする。**

```tsx
// App.tsx から Footer を削除
function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 flex flex-col">
          <Routes>...</Routes>
        </main>
        {/* Footer はここにない */}
      </div>
    </BrowserRouter>
  );
}

// event.tsx - フォーム表示のみ Footer を持つ
if (submitted) {
  return <div>...サンクス画面（Footerなし）...</div>;
}

return (
  <>
    <div>...フォーム...</div>
    <Footer />  // フォーム表示時のみ
  </>
);
```

create-event.tsx と admin.tsx にも Footer を移動しました。利用規約・プライバシーポリシー・FAQは「行き止まりページ」なので Footer を持ちません。

**教訓：グローバルレイアウトではコンポーネントの「サブ状態」を制御できない。ページ固有の表示ロジックはページに持たせる。**

---

## まとめ：「小さいバグが設計を問い直す」

1件のバグ修正で起きたこと：

| # | 設計判断 | 教訓 |
|---|---------|------|
| ① | `document.referrer` より `location.state` | SPA遷移にはReferrerが使えない |
| ② | フッターリンクを `<Link>` に統一 | SPA内リンクは `<Link>` を使う |
| ③ | 法的ページのフッターを消す | 行き止まりページにナビゲーションは不要 |
| ④ | Footer を App.tsx からページに移す | グローバルレイアウトはサブ状態を制御できない |

変更ファイル：App.tsx / footer.tsx / terms.tsx / privacy.tsx / faq.tsx / create-event.tsx / admin.tsx / event.tsx

修正するたびに「次の問題」が出てきたのは、**表層的なコード修正ではなく設計レベルで直していた**からだと思います。最初に `<Link to="/">` を `<Link to={backTo}>` に書き換えるだけなら5分で終わりました。でもそれをすると別の問題が顕在化する。

Claude Codeとの会話を通じて「なぜそうなっているのか」を問い続けることで、根本的に正しい設計に近づいていきました。

これが完全委任開発の醍醐味かもしれません。実装は委任しても、設計の問いを投げるのは人間の仕事です。
