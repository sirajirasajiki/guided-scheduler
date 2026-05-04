# Plan: CLAUDE.md にブログ下書き成果物ルールを追記する

## Context

Issue #13 の対応。Claude Code にブログ記事作成を依頼した際、以下の2つのミスが発生した：
- `.md` ファイルを作成せず `wordpress/*.html` のみ作成した
- 記事作成日（5/3）で新規フォルダを切り、同週（5/2 の週）のフォルダに入れなかった

CLAUDE.md にルールが明記されていないことが原因のため、成果物ルールとフォルダ命名規則を追記する。

**重要**: CLAUDE.md は「本ファイルの変更は人間 (Fujiki) のみが行う」ため、このプランは変更内容の提案にとどまる。実際の編集は人間が行う。

---

## 追記内容

### 挿入位置

`## プランファイルの保存先` セクション（268行目付近）の直後、`## 開発コマンド` セクションの直前。

---

### 追記するテキスト

```markdown
## ブログ記事下書きの成果物ルール

ブログ記事の下書きを作成する際は、以下のルールに従うこと。

### ファイルセット

記事1本につき **必ず2ファイルをセットで作成する**：

- `drafts/weekly/YYYY-MM-DD/{記事名}.md`
- `drafts/weekly/YYYY-MM-DD/wordpress/{記事名}-wp.html`

`.md` のみ、または `.html` のみの作成は禁止。

### フォルダ命名規則

- `drafts/weekly/` 配下のフォルダは**週単位（月〜日）**で切る
- 同じ週の記事は必ず同じフォルダに入れる
- フォルダ名は**その週の最初の記事を作成した日付**（`YYYY-MM-DD` 形式）にする
- 記事の作成日が週の途中でも、その週のフォルダが既に存在すればそちらに入れる

### 確認手順

記事作成前に `drafts/weekly/` を確認し、当該週のフォルダが既に存在するかをチェックすること。

---
```

---

## 既存フォルダ構成との整合性確認

現在の `drafts/weekly/` 構成を確認済み：

| フォルダ | 内容 |
|---|---|
| `2026-04-06/` | article-01, 02, 03 の `.md` + `wordpress/*.html` セット |
| `2026-04-20/` | legal-pages, step1-store の `.md` + `wordpress/*.html` セット |
| `2026-04-27/` | db-separation, github-actions-cleanup, readme-glob-issue, article-check の `.md` + `wordpress/*.html` セット |
| `2026-05-02/` | faq-page, github-issue-slash-command, issue-command-bug-task-detection, spa-back-link, github-issues-task-detection-flow の `.md` + `wordpress/*.html` セット |

いずれも2ファイルセット・週単位フォルダの構成を満たしている。追記するルールは現状の運用を明文化するもの。

---

## 完了条件

- CLAUDE.md の `## プランファイルの保存先` の直後に上記セクションが追記されている
- 次回のブログ記事作成依頼で、指示なしに `.md` と `wordpress/*.html` の両ファイルが正しい週フォルダに作成される
