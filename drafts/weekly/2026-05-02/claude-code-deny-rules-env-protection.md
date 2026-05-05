---
title: "Claude Code で .env を守る — deny ルール・バグ・hook を徹底検証した話"
slug: "claude-code-deny-rules-env-protection"
status: "draft"
source_dates:
  - "2026-05-05"
tags:
  - "Claude Code"
  - "セキュリティ"
  - "Cloudflare"
seo_title: "Claude Code で .env を守る設定を徹底検証【deny ルール・hook・2026年版】"
keywords: "Claude Code, settings.json, deny ルール, .env, セキュリティ, hook, PreToolUse"
meta:
  description_candidates:
    - "Claude Code の settings.json deny ルールで .env を守れるか徹底検証。バグの実態・Bash 抜けを hook で塞ぐ方法・実測テスト結果まで解説。"
    - "丸投げ開発で .env が読まれるリスクを deny ルール＋PreToolUse hook で防御。テスト結果を元に有効性を整理。"
    - "Claude Code の deny ルールは本当に効くのか？GitHub Issue のバグと実測テストで見えてきた現実と対策をまとめた。"
---

こんにちは、白々さじきです。

Claude Code への完全委任開発を検証しているシリーズの途中で、ふと気になったことがありました。「そういえば、Claude Code って .env ファイルも普通に読めるんじゃないか？」という素朴な疑問です。

この記事は、その疑問をきっかけに deny ルールを設定し、GitHub の Issue でバグを見つけて不安になり、hook を追加して、最後に実際にテストしてみたら「思ったより守れていた」という話です。

---

## .env が読まれると何が問題か

まず Claude Code 自身に聞いてみました。

> Claude Code に .env ファイルとかを読ませてしまうデメリットって何？

返ってきた答えを整理すると、5つのリスクに分類できました。

**1. 機密情報のコンテキスト混入**

API キー、DB 接続文字列、トークン等が会話履歴・ログに残ります。Claude のモデル学習には使われないとされていますが、Anthropic 側のサーバーに送信自体は発生します。セッションログ・使用状況の自動送信（テレメトリ）・エラーレポート経由で漏れる可能性もゼロではありません。

**2. 生成物への漏洩**

Claude が「親切心」で README・サンプルコード・ドキュメントに実値を埋め込むことがあります。コミットメッセージや PR 説明に値が混ざるケース、自動生成ドキュメントに転記されるケースなどが考えられます。`localhost` URL が本番向け成果物に紛れ込むのと同種の事故パターンです。

**3. Git 履歴汚染**

Claude が `.gitignore` を見落として `git add -A` で `.env` をステージしてしまうケースがあります。一度 push されると履歴の rewrite が必要になり、シークレットのローテーションも必須になります。

**4. プロンプトインジェクション経由の流出**

外部 URL フェッチを許可している運用では、悪意あるページの指示で「.env の中身を要約して」等が成立しうるリスクがあります。WebFetch の許可範囲が広いほどリスクは高まります。

**5. 監査・コンプライアンス**

業務用途では、顧客環境のシークレットを外部 LLM に送ると NDA 抵触の可能性があります。個人検証リポジトリと業務リポジトリで運用を分ける必要があります。本記事は個人検証リポジトリを対象としているため直接は該当しませんが、同じ運用を業務環境に持ち込む際は注意が必要です。

---

## settings.json の deny ルールとは

Claude Code には `~/.claude/settings.json`（グローバル）または `.claude/settings.json`（プロジェクト）に権限設定を書く仕組みがあります。

`deny` ルールを使うと、特定のツール呼び出しを禁止できます。

```json
{
  "permissions": {
    "deny": ["Read(.env)", "Write(.env)"]
  }
}
```

評価順序は **deny → ask → allow** の順で、deny が常に優先されます。

---

## 実際に設定した deny ルール

今回、プロジェクトの `.claude/settings.local.json` に次の deny ルールを追加しました。`Read` だけでなく `Edit`・`Write` も必要と気づいたため、3ツール分すべてを設定しています。

```json
{
  "permissions": {
    "deny": [
      "Read(.env)",
      "Read(.env.*)",
      "Read(**/.env)",
      "Read(**/.env.*)",
      "Read(**/*.pem)",
      "Read(**/*credentials*)",
      "Read(**/secrets/**)",
      "Edit(.env)",
      "Edit(.env.*)",
      "Edit(**/.env)",
      "Edit(**/.env.*)",
      "Edit(**/*.pem)",
      "Edit(**/*credentials*)",
      "Edit(**/secrets/**)",
      "Write(.env)",
      "Write(.env.*)",
      "Write(**/.env)",
      "Write(**/.env.*)",
      "Write(**/*.pem)",
      "Write(**/*credentials*)",
      "Write(**/secrets/**)"
    ]
  }
}
```

「これで守られた」と思っていましたが、調べると話はそう単純ではありませんでした。

---

## deny ルールにはバグ報告がある（2026年5月時点）

GitHub の公式リポジトリに複数の Issue が報告されています。

- **[Issue #8031](https://github.com/anthropics/claude-code/issues/8031)**（2025年9月報告）：`.env` の内容が deny 設定をしているにもかかわらず読まれた。自動クローズされたが**修正は行われていない**。
- **[Issue #27040](https://github.com/anthropics/claude-code/issues/27040)**（2026年2月報告）：`.claude/settings.json` の deny ルールが無視される。**2026年5月時点で OPEN のまま**。

また、deny ルールは Read/Edit/Write ツールをブロックするだけで、**`Bash(cat .env)` のようなシェルコマンド経由のアクセスは別ルール扱い**になるという根本的な穴があります。

そこで次の2つの対策を追加しました。

---

## Bash 経由のバイパスを防ぐ：PreToolUse hook

Claude Code には、ツール呼び出しの直前にシェルスクリプトを実行できる **PreToolUse hook** という仕組みがあります。GitHub Issue のコメントでも「deny ルールがバグで機能しないので hook で代替実装した」という報告が複数ありました。

`.claude/hooks/block-env-files.py` を作成し、`settings.local.json` に登録しました。

```python
# .claude/hooks/block-env-files.py
import sys, json, re

SENSITIVE_FILE_PATTERNS = [
    r"\.env($|\.)", r"\.pem$", r"credentials", r"secrets[/\\]",
]
SHELL_ENV_PATTERNS = [
    r"(cat|grep|head|tail|less|more|type|source)\s+\S*\.env",
    r"Get-Content\s+\S*\.env",
    r"\.\s+\S*\.env",
]

def block(reason):
    print(json.dumps({"decision": "block", "reason": reason}))
    sys.exit(0)

try:
    data = json.load(sys.stdin)
    tool = data.get("tool_name", "")
    inp  = data.get("tool_input", {})

    file_path = inp.get("file_path", "")
    if file_path and any(re.search(p, file_path, re.IGNORECASE) for p in SENSITIVE_FILE_PATTERNS):
        block(f"Sensitive file access denied: {file_path}")

    if tool == "Bash":
        cmd = inp.get("command", "")
        if any(re.search(p, cmd, re.IGNORECASE) for p in SHELL_ENV_PATTERNS):
            block(f"Shell access to .env file denied: {cmd[:60]}")
except SystemExit:
    raise
except Exception:
    pass
```

`settings.local.json` への hook の登録：

```json
{
  "permissions": {
    "hooks": {
      "PreToolUse": [
        {
          "matcher": "",
          "hooks": [
            {
              "type": "command",
              "command": "python .claude/hooks/block-env-files.py"
            }
          ]
        }
      ]
    }
  }
}
```

---

## 実際にテストしてみた

ダミーの `.env` ファイルを作成し、各アクセス手段を試しました。

```
# テスト用 .env（ダミー値）
DUMMY_API_KEY=test-dummy-key-12345
DUMMY_DB_PASSWORD=test-dummy-password
```

まずファイルの作成から試みました。

> じゃあ実際に .env を置いてアクセスできないか確認してみるか。

これに対して Claude Code はいくつかの手段でファイル作成を試みましたが、すべてブロックされました。

```
# Write ツールで作成を試みる → ブロック
File is in a directory that is denied by your permission settings.

# PowerShell Set-Content で作成を試みる → ブロック
set-content targeting '.../.env' was blocked.
```

ファイルは手動で作成し、その後アクセステストを実施しました。

```
# Read ツールでの読み取りを試みる → ブロック
File is in a directory that is denied by your permission settings.

# Bash で cat を試みる → hook がブロック
Permission to use Bash with command cat ".../.env" has been denied.

# 比較：cat package.json は通過
{ "name": "guided-scheduler", ... }
```

`cat package.json` は通過し `cat .env` はブロックされたことで、deny ルールと hook がそれぞれ正しく `.env` 限定で動作していることを確認できました。

結果まとめ：

| 操作               | ツール       | 結果        | 発動した防御                          |
| ------------------ | ------------ | ----------- | ------------------------------------- |
| `Write(.env)`      | Write ツール | ✅ ブロック | deny ルール                           |
| `Set-Content .env` | PowerShell   | ✅ ブロック | deny ルール（PS にも有効と判明）      |
| `Remove-Item .env` | PowerShell   | ✅ ブロック | deny ルール（削除も防いだ）           |
| `Read(.env)`       | Read ツール  | ✅ ブロック | deny ルール                           |
| `cat .env`         | Bash         | ✅ ブロック | **hook**（`cat package.json` は通過） |

**deny ルールは Read/Write/Edit ツールだけでなく、PowerShell の書き込み・削除操作にまで有効でした**。バグ報告はあるものの、少なくともこの環境・バージョンでは想定より広い範囲で機能しています。

`cat .env` は deny ルールの対象外（Bash ツール）でしたが、hook が正確にキャッチしました。`cat package.json` は通過したことで、`.env` 限定のブロックであることも確認できています。

---

## 余談：wrangler.toml の database_id は漏れても大丈夫？

話の流れで「.toml ファイルも deny した方がいいか？」という疑問が出てきました。

このプロジェクトの `wrangler.toml` には Cloudflare D1 の `database_id` が書かれています。

調べた結果、**`database_id` 単体では何もできません**。Cloudflare D1 の REST API にアクセスするには、database_id・account_id・API Token の3つがすべて必要です。API Token は `wrangler.toml` には含まれておらず、Cloudflare 側で発行・失効できます。

`wrangler.toml` を deny リストに追加すると Claude が DB 構成やデプロイ設定を把握できなくなり作業の邪魔になるため、**deny しない方が正解**という結論になりました。

---

## guided-scheduler の場合 — そもそも .env がなかった

調べていて気づいたのですが、このプロジェクト（guided-scheduler）には `.env` ファイルが存在しませんでした。

Cloudflare Workers では、シークレット情報は `wrangler secret put` コマンドで Cloudflare 側に登録し、`env` バインディング経由で参照する設計になっています。

「守ろうとしていたファイルが最初から存在しなかった」という結末でした。ただし deny ルールと hook の仕組みは他のプロジェクトでも再利用できるため、設定しておく価値はあります。

---

## .env が必要な他のプロジェクトではどうすればいい？

Next.js や Node.js のプロジェクトなど、`.env` ファイルが必要な場面は多くあります。現実的な対処法をまとめます。

### 1. deny ルール ＋ hook を設定する（今回の実装）

本記事で紹介した `.claude/settings.local.json` の deny ルールと `.claude/hooks/block-env-files.py` を導入します。Read/Write/Edit/Bash の各方向からのアクセスをブロックできます。

### 2. `.env.example` だけリポジトリに置き、実際の `.env` は渡さない

キー名だけを書いた `.env.example` をリポジトリに置き、実際の値が入った `.env` は Claude Code のコンテキストに入れない運用です。CLAUDE.md に「`.env` は読まないこと」と明記するとソフトな抑止になります。

### 3. シークレット管理ツールで値を注入し .env 自体を作らない

.env ファイル自体を置かず、実行時にシークレット管理ツールから注入する設計です。筆者自身は未実施ですが、以下のようなツールが選択肢になります（詳細は各公式ドキュメントを参照してください）。

- **[Doppler](https://www.doppler.com/)** — SaaS 型のシークレット管理（※筆者未実施）
- **[1Password CLI](https://developer.1password.com/docs/cli/)** — 1Password のシークレットをコマンドから注入（※筆者未実施）
- **[direnv](https://direnv.net/)** — ディレクトリ単位で環境変数を管理するシェル拡張（※筆者未実施）

---

## 対策の有効性まとめ

| 対策                               | 有効性                       | 備考                                     |
| ---------------------------------- | ---------------------------- | ---------------------------------------- |
| `settings.json` の deny ルール     | ✅ Read/Write/Edit/PS に有効 | バグ報告あり・バージョン依存の可能性あり |
| PreToolUse hook                    | ✅ Bash 経由もブロック       | deny のバグを補完する二重防衛            |
| `.env.example` のみ渡す運用        | ✅ 確実                      | 最も手軽                                 |
| シークレット管理ツールで注入       | ✅ 確実                      | .env 自体を作らない設計                  |
| CLAUDE.md に「読まないこと」と明記 | △ ソフトな抑止               | Claude が従うかは保証なし                |
| .env ファイル自体を置かない設計    | ✅ 最も確実                  | Cloudflare Secrets 等を活用              |

---

## まとめ

deny ルールのバグ報告を見て「機能していないのでは」と不安になりましたが、実際にテストしてみると Read/Write/Edit ツールに加えて PowerShell 操作まで広くブロックされていました。一方で Bash 経由（`cat .env` 等）は抜けられるため、PreToolUse hook で補完しています。

「設定したから安心」ではなく、「設定してテストして初めて安心できる」というのが今回の学びです。

**教訓：deny ルールは設定後に必ず動作確認すること。Bash 抜けは hook で補完し、根本対策は「.env ファイル自体を置かない設計」と組み合わせるのが最善。**
