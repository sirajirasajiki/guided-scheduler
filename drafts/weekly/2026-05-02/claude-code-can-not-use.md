---
title: "VS Code の Claude Code 拡張が Activating のまま開かなくなった話【バージョン不一致が原因だった】"
slug: "claude-code-can-not-use"
status: "draft"
source_dates:
  - "2026-05-06"
tags:
  - "Claude Code"
  - "VS Code"
  - "トラブルシューティング"
seo_title: "VS Code の Claude Code 拡張が Activating で止まる問題の解決方法【バージョン不一致】"
keywords: "Claude Code, VS Code, Activating, 拡張機能, バージョン不一致, ロールバック, Install Specific Version, Developer Tools, トラブルシューティング, claude-vscode, 2.1.129, アンインストール, バージョンアップ"
meta:
  description_candidates:
    - "VS Code の Claude Code 拡張が Activating のまま止まった。CLI をバージョンアップしても直らず、Developer Tools で拡張バグを特定。アンインストール→再インストールでも再発し、Install Specific Version で解決した手順を解説。"
    - "Claude Code 拡張が Activating で止まる場合、CLI 更新でも再インストールでも直らないことがある。Developer Tools でバグを特定し、Install Specific Version でロールバックする手順をまとめた。"
    - "Claude CLI をバージョンアップしても VS Code 拡張の Activating が解消しない場合の診断と解決フロー。Install Specific Version で特定バージョンを指定するのがポイント。"
---

# VS Code の Claude Code 拡張が Activating のまま開かなくなった話【バージョン不一致が原因だった】

こんにちは、白々さじきです。

昨日まで普通に使えていた VS Code の Claude Code 拡張が、ある日突然 `Activating...` のまま動かなくなりました。

「CLI のバージョンが古いのかも」と思ってバージョンアップしてみたのですが、それでも直らず。その後アンインストール・再インストールも試しましたがやはり再発し、原因特定に手間取りました。同じ症状で詰まっている人向けに、実際にたどった手順をそのまま書き残します。

---

## 症状

<!-- スクショ: VS Code のサイドバーまたはステータスバーに Activating... と表示されている状態 -->

- VS Code の Claude Code 拡張が `Activating...` のまま止まっている
- `command 'claude-vscode.editor.openLast' not found` というエラーが出る
- Claude Code CLI 自体はターミナルで動いている

---

## まず CLI をバージョンアップした（でも直らなかった）

拡張と CLI のバージョンがずれていると動かないことがあると聞いたことがあったので、まず CLI を更新してみた。

VS Code 内ターミナル（`Ctrl+@`）で実行。

```bash
claude --version
```

バージョンが古かったので更新した。

```bash
npm update -g @anthropic-ai/claude-code
```

VS Code を再起動したが、**`Activating...` は解消されなかった。**

---

## 次に Developer Tools でエラーを確認した

`Ctrl+Shift+P` → `Developer: Toggle Developer Tools` → Console タブを開く。

Filter ボックスに `claude` と入力して絞り込む。

<!-- スクショ: Developer Tools の Console タブ。claude フィルタをかけた状態でエラーが表示されている -->

以下のエラーが出ていた。

```
Activating extension 'Anthropic.claude-code' failed:
The argument 'filename' must be a file URL object, file URL string, or absolute path string.
Received 'file:///home/runner/work/claude-cli-internal/claude-cli-internal/build-agent-sdk/sdk.mjs'.
```

`/home/runner/work/...` というパスは GitHub Actions のビルド環境のパスで、Windows 環境には存在しない。拡張のビルド時にパスがハードコードされたまま配布されてしまったと考えられる。

つまり原因は **拡張の 2.1.129 にリリースバグが含まれていた**こと。CLI 側は無関係。

---

## アンインストール → 再インストール（でも直らなかった）

「壊れているなら入れ直せばいいか」と思い、いったんアンインストールした。

<!-- スクショ: Extensions パネルで Claude Code を選択し、アンインストールボタンが表示されている状態 -->

Extensions（`Ctrl+Shift+X`）→ Claude Code → `Uninstall` を選択。VS Code を再起動後、マーケットプレイスから再インストール。

<!-- スクショ: マーケットプレイスから Claude Code をインストールしている状態（または再起動後に Install ボタンを押している状態） -->

結果：**同じ症状が再発した。**

当然といえば当然で、再インストールしても最新版（2.1.129）が入るため、同じバグを踏む。

---

## 特定バージョンを指定してインストールする

再インストール後、今度は別のバージョンを指定してインストールした。

Extensions（`Ctrl+Shift+X`）→ Claude Code → 歯車アイコン → `Install Specific Version...`

<!-- スクショ: 歯車アイコンを押したメニューに Install Specific Version... が表示されている状態 -->

一覧から `2.1.128`（またはそれ以前）を選択してインストール。

<!-- スクショ: バージョン一覧から 2.1.128 を選択している状態 -->

VS Code を再起動したところ、`Activating...` が解消されて正常に起動した。

<!-- スクショ: Claude Code 拡張が正常に起動し、アイコンやパネルが使える状態 -->

---

## 補足：CLI と拡張のバージョンは完全一致しなくても動く

解決後の状態：

- 拡張：2.1.128
- CLI：2.1.129

この組み合わせで正常に動作している。CLI と拡張は完全に同じバージョンである必要はない。2.1.129 の拡張にバグがあっただけなので、Anthropic が修正版をリリースしたら拡張だけ更新すれば揃う。

---

## 診断フロー

```
Activating... のまま止まる
    ↓
CLI を npm update でバージョンアップ → 直らない
    ↓
Developer Tools → Console → claude でフィルタ
    ↓
"filename must be a file URL..." のエラーを確認
    ↓
拡張をアンインストール → 再インストール → 同じ症状が出る
（最新版に同じバグが入っているため）
    ↓
Install Specific Version... でひとつ前のバージョンを指定
    ↓
VS Code を再起動 → 解消
```

---

## まとめ

- CLI のバージョンアップで直らない場合、拡張側のバグの可能性がある
- `Activating...` で止まる場合、Output ログに Claude Code のチャンネル自体が存在しないことがある（＝起動処理が始まっていない）
- Developer Tools の Console で `claude` フィルタをかけると原因が特定しやすい
- 拡張の自動更新でバグが入ることがある。再インストールでは直らず、`Install Specific Version...` で古いバージョンを指定する必要がある
- CLI と拡張のバージョンは完全一致しなくても動く
