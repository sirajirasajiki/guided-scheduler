---
title: "うっかりlocalhostをコミットしないためのCI自動チェックをClaude Codeに作らせた話"
slug: "ci-check-local-urls-with-claude-code"
status: "draft"
source_dates:
  - "2026-05-02"
tags:
  - "Claude Code"
  - "GitHub Actions"
  - "CI/CD"
  - "AI駆動開発"
seo_title: "うっかりlocalhostをコミットしないためのCI自動チェックをClaude Codeに作らせた話"
keywords: "Claude Code, GitHub Actions, CI, localhost, debugger, grep, 自動チェック, AI駆動開発"
---

こんにちは、白々さじきです。

「grep するだけだから簡単でしょ」と思っていた CI 整備。やってみると、実装後の動作確認で気づくことが次々と出てきました。今回はその一部始終を書きます。


## きっかけ：terms.tsx に localhost が残っていた

幹事ツール（飲み会日程調整 Web アプリ）を開発している中で、利用規約ページ（`terms.tsx`）に `localhost` の URL が混入していることに気づきました。

開発中にローカル動作確認用のリンクを書いて、そのままコミットしてしまったのです。本番で普通に表示されていたので、気づくのが遅れました。

**これを二度と起こさないために、CI で自動検出する仕組みを入れることにしました。**


## 実装前に：Plan モードで合意を取る

実装を指示する前に、まず**プランを作らせて内容を確認してから承認する**手順を踏みました。使ったプロンプトはこれだけです。

```
このIssueを実行するための計画を立ててください。
https://github.com/sirajirasajiki/guided-scheduler/issues/3
計画は、docs/に作成してください。
```

Claude Code には「Plan モード」があり、このモードではファイルの変更を一切行わず、計画を作ることだけに専念します。GitHub の Issue URL をそのまま渡すと Issue を読んで計画を立ててくれます。

出来上がった計画書: [docs/plan-issue-3-check-local-urls.md](../../docs/plan-issue-3-check-local-urls.md)

計画書を確認しながら対話する段階で、後述する追加項目の議論が生まれました。**実装後に気づいて直すより、計画段階で気づく方がコストが低い。** Plan モードを使う習慣は、このプロジェクトを通じて身についた「Claude Code との付き合い方」のひとつです。


## 一発完成ではなかった：対話と確認で積み上がった変更

方針はシンプルです。`src/` 配下を grep して `localhost` が含まれていたらビルドを失敗させる。それだけのはずでした。ここから完成まで、計4回の変更がありました。

### 変更①：YAML のキー順序を既存ファイルに合わせた

最初に Claude Code が出してきたステップはこうでした。

```yaml
- uses: actions/checkout@v4
  name: Checkout
```

既存の `cleanup-old-events.yml` と並べると順番が逆です。

```yaml
- name: Checkout   ← 既存ファイルはこちら
  uses: actions/checkout@v4
```

「どっちが一般的？」と聞いたところ、「`name:` を先に書くのが一般的。読んだときに何をするステップか先に分かるので」との回答。`name:` 先に修正しました。

「既存ファイルの書き方に合わせる」と指示していたにもかかわらず逆順で出てきた点は手戻りです。**完成物を既存ファイルと並べて比較する**ことで気づけました。

### 変更②：「他に一緒に弾いた方がいいものない？」→ debugger の追加

プランレビュー中にこんなやりとりをしました。

> 「他にローカルホストで使いそうなURLってあったりする？また、この時一緒に弾いたほうがいいものを提案してほしい。なければないでOK」

Claude Code からの回答：

- `::1`（IPv6 ループバック）→ 誤検知リスクが高いので見送り
- `0.0.0.0`（dev サーバーのバインド先）→ `wrangler.toml` 等で正当に使われるケースがあり見送り
- **`debugger` 文** → JS/TS のデバッグ用ブレークポイント。DevTools を開いているとブラウザが止まる。採用

「`debugger` って何？」と聞いたら説明してくれました。

> 「ブラウザの DevTools を開いた状態でこのコードが実行されると、その行でブレークポイントが発動し処理が止まります。DevTools を閉じていれば影響なしですが、うっかり残った系のコードなので一緒にチェックするのが妥当です」

**「他にある？」の一言で、自分では思いつかなかった項目が出てきました。** Claude Code は指示の範囲内で動くので、引き出すための質問が有効です。

### 変更③：トリガーを全ブランチ → main push のみに絞った

「LINT が毎回発生すると Actions が無限に生成されるのまずいか？」と聞いたところ：

> 「push を全ブランチにすると、PR に push するたびに push イベントと PR イベントの2回ワークフローが走ります。push を main のみに絞れば約半分に減ります」

これを受けて `push` を main ブランチのみに変更しました。

### 変更④：localhost と debugger が同時にあっても両方検出できるように

動作確認中に `src/test-debug-check.txt` に両方を入れて試したところ、問題が発覚しました。

```
http://localhost:3000/api
debugger
```

ワークフローのステップは直列で動くため、**localhost チェックが `exit 1` で失敗した時点で、debugger チェックのステップが実行されません。** 両方に問題があっても、Actions 上では localhost のエラーしか表示されない状態でした。

対処は `if: always()` を追加するだけです。これで前のステップが失敗しても、debugger チェックが必ず実行されます。

```yaml
- name: Check for debugger statements
  if: always()   ← 追加
  run: ...
```


## 最終的なワークフロー

4つの変更を経て完成したファイルです。

```yaml
name: Lint - Check for debug artifacts in src/

on:
  push:
    branches:
      - main
  pull_request:

jobs:
  check-debug-artifacts:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Check for local URLs (localhost / 127.0.0.1)
        run: |
          if grep -rEn "127\.0\.0\.1|localhost" src/; then
            echo "ERROR: ローカルURLが src/ 内に残存しています。コミット前に修正してください。"
            exit 1
          else
            echo "OK: ローカルURLは見つかりませんでした。"
          fi

      - name: Check for debugger statements
        if: always()
        run: |
          if grep -rn "debugger" src/; then
            echo "ERROR: debugger 文が src/ 内に残存しています。コミット前に削除してください。"
            exit 1
          else
            echo "OK: debugger 文は見つかりませんでした。"
          fi
```

**`uses: actions/checkout@v4` について：** GitHub Actions のジョブは毎回まっさらな Ubuntu 仮想マシンで動きます。最初はリポジトリのコードがどこにもないので、`checkout` でコードを取得してから `grep` を実行します。


## 動作確認

「本当に動くか」を段階的に確かめました。

**テスト1：テキストファイルと .tsx コメントで基本動作を確認**

`src/test-local-url.txt` に `localhost` を追加してローカル grep を実行。さらに `App.tsx` にもコメントとして追加して、tsx ファイルのコメント行も検出されることを確認しました。

```bash
grep -rEn "127\.0\.0\.1|localhost" src/
# → src/test-local-url.txt:2:http://localhost:3000/api
# → src/client/App.tsx:28:// テスト用: http://localhost:3000/api
```

**コメント行も検出されます。** コードの動作に影響しないコメントも grep は引っかけます。これが CLAUDE.md に「コメント内も含め書かないこと」と明記した理由です。

[//]: # (スクリーンショット: GitHub Actions のジョブ失敗画面。ログに「ERROR: ローカルURLが src/ 内に残存しています」と表示されている状態)

**テスト2：drafts/ は対象外であることを確認**

`drafts/` にも同じ内容のファイルを置いて CI が失敗しないことを確認。ワークフローの grep は `src/` のみが対象なので、`drafts/` にあっても検出されません。

[//]: # (スクリーンショット: GitHub Actions のジョブ成功画面。「OK: ローカルURLは見つかりませんでした。」と表示されている状態)

**テスト3：localhost と debugger が同時にある場合**

`src/test-debug-check.txt` に両方を入れて確認。`if: always()` の追加後は2つのステップがそれぞれ独立して失敗するようになりました。

[//]: # (スクリーンショット: GitHub Actions のジョブ失敗画面。「Check for local URLs」と「Check for debugger statements」の2ステップがどちらも赤くなっている状態)

**テスト後はすべて削除して完了。**


## 周辺整備

CI を追加したタイミングで、周辺ファイルも合わせて整備しました。

**CLAUDE.md** に「コメント内も含め localhost を書かない」「debugger を残さない」ルールを追記。**README.md** に GitHub Actions セクションを追加して、どのワークフローが動いているかを記載。

[//]: # (スクリーンショット: GitHub のリポジトリ Actions タブ。2つのワークフローが一覧表示されている状態)

**settings.local.json** は過去の動作確認で追加したハードコード UUID 付きの `curl` コマンドが大量に残っていたので整理しました。汎用パターン `"Bash(curl *)"` 1件に集約しています。

[//]: # (スクリーンショット: settings.local.json の整理前後の差分。Before では curl コマンドが10件以上あり、After では汎用パターン「Bash(curl *)」1件に集約されている)


## まとめ

「grep するだけだから簡単でしょ」と思っていましたが、実際にやってみると計4回の変更がありました。YAML のキー順序、追加チェック項目の検討、トリガーの絞り込み、そして `if: always()` の追加。**頭の中で考えているときは見えなかった問題が、動かして初めて見えてきます。**

CI に限らず Claude Code との開発全般に言えることで、**計画・実装・確認のサイクルを小さく回す**ことの大事さを改めて感じました。

今回いちばんの学びは「**他に入れるものない？**」の一言です。最初の指示だけでは `debugger` チェックは出てきませんでした。Claude Code は指示の範囲内で動くので、引き出すための質問を意識的に入れると仕様の漏れが減ります。


## 参考リンク

- [GitHub Actions 公式ドキュメント](https://docs.github.com/ja/actions)
- [actions/checkout](https://github.com/actions/checkout)
