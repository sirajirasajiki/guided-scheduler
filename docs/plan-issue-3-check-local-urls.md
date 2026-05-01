# Issue #3: 本番URLのローカル残存チェックをCIで自動化する

## 背景

`terms.tsx` にローカルURL（`localhost`）が誤ってコミットされた事象があった。
同様の事故を防ぐため、GitHub Actions CI でソースコードを自動検査する。

## 対象チェック

| チェック内容 | 検出パターン | 理由 |
|------------|------------|------|
| ローカルURL | `localhost` / `127.0.0.1` | 開発環境のURLが本番コードに残存するのを防ぐ |
| debugger 文 | `debugger` | JS/TS のデバッグ用ブレークポイントが残存するのを防ぐ |

## 実装ファイル

`.github/workflows/check-local-urls.yml`

- トリガー: `push` / `pull_request`（全ブランチ）
- 追加の依存なし（`actions/checkout@v4` のみ）
- 検出時: exit 1 でジョブ失敗、ファイル名・行番号・マッチ内容を出力

## 検証方法

1. このファイルをプッシュ後、GitHub の Actions タブで `Lint - Check for debug artifacts in src/` が実行されることを確認
2. 現状の `src/` にはローカルURLも `debugger` もないため、両ステップとも成功するはず
3. 動作確認: 任意の `src/` 配下ファイルに `localhost` を一時追加してプッシュし、ジョブが失敗することを確認後リバート
