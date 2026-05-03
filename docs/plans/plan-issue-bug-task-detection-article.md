# プラン：ブログ記事「/issue コマンドをバグ・タスク判定対応に進化させた」

## Context

前回の記事（`drafts/weekly/2026-05-02/github-issue-slash-command.md`）で
Claude Code カスタムスラッシュコマンドによる GitHub Issue 自動作成を取り上げた。
今回はその続編として、バグとタスクで内容が異なる問題を解決するための
型判定ロジック追加・テンプレート分岐・コマンド名衝突対応を記事にする。

---

## 記事メタ情報

- **タイトル**：Claude Code の /issue コマンドをバグ・タスク判定対応に進化させた
- **slug**：`issue-command-bug-task-detection`
- **記事タイプ**：実装検証（前回記事の続編）
- **保存先**：`drafts/weekly/2026-05-02/`（2026-05-03 土曜 = 同週 April 27 - May 3）

---

## 見出し構成

### ## はじめに：前回から見えた課題
- 前回作った /issue コマンドはバグもタスクも同じテンプレートだった
- バグには再現手順・期待/実際の動作、タスクには背景・やることが必要と気づいた

### ## .github/ISSUE_TEMPLATE/ の整備
- GitHub 標準テンプレート（bug_report.md / task.md）を追加した経緯
- テンプレートの内容（フィールドの選択理由）

### ## /issue コマンドの型判定ロジック
- 「動かない」「エラー」→ バグ、「追加したい」「改善したい」→ タスクと判定
- 各型でテンプレートが切り替わり、`--label bug` / `--label task` も自動付与
- グローバル版とプロジェクト版（assignee 固定・タスク概要追加）の差分

### ## つまずき①：コマンド名の衝突
- `~/.claude/commands/issue.md` と `.claude/commands/issue.md` が同名で存在
- プロジェクト版が呼ばれるはずなのにグローバル版が実行されていた
- `issue-guided-scheduler.md` にリネームして解決した経緯

### ## おまけ：/article コマンドも整備した
- EnterPlanMode のプランはデフォルトで `~/.claude/plans/` に保存される
- プロジェクトのコンテキストなのにリポジトリ外に置かれるのが不便だった
- `docs/plans/` に保存するようコマンドとメモリに明記して解決

### ## まとめ
- 教訓と改善効果を振り返る

---

## 固定ルール

- 書き出し：「こんにちは、白々さじきです。」
- 教訓形式：`**教訓：〇〇**`（太字コロン形式）
- フロントマター：title / slug / status / source_dates / tags / seo_title / keywords / meta.description_candidates（3案）
- WordPress 版：フロントマターなし、シンプル HTML、`<!-- wp:... -->` 不使用

---

## 作成ファイル

1. `drafts/weekly/2026-05-02/issue-command-bug-task-detection.md`
2. `drafts/weekly/2026-05-02/wordpress/issue-command-bug-task-detection-wp.html`
