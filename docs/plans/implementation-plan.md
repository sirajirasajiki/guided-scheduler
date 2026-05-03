# 実装計画 (Day 2-4 スコープ)

## 進捗凡例
- ✅ 完了
- 🔄 進行中
- ⬜ 未着手

---

## フェーズ 0 : 準備・クリーンアップ

| 状態 | # | タスク |
|------|---|--------|
| ✅ | 0-1 | react-router-dom インストール |
| ✅ | 0-2 | App.tsx を Vite デフォルトからルーター雛形に置き換え |
| ✅ | 0-3 | 不要な Vite デフォルトファイル削除（App.css・assets 内 svg/png） |

---

## フェーズ 1 : 共有型定義

| 状態 | # | タスク | 対象ファイル |
|------|---|--------|------------|
| ✅ | 1-1 | `ResponseValue` 型（`"o" \| "d" \| "x"`） | src/shared/types.ts |
| ✅ | 1-2 | `CreateEventRequest` / `CreateEventResponse` | src/shared/types.ts |
| ✅ | 1-3 | `GetEventAdminResponse`（イベント情報＋参加者一覧） | src/shared/types.ts |
| ✅ | 1-4 | `GetEventShareResponse`（参加者に見せる情報のみ） | src/shared/types.ts |
| ✅ | 1-5 | `SubmitParticipantRequest` / `SubmitParticipantResponse` | src/shared/types.ts |
| ✅ | 1-6 | `ConfirmDateRequest` | src/shared/types.ts |

---

## フェーズ 2 : API 実装（Hono）

| 状態 | # | タスク | 対象ファイル |
|------|---|--------|------------|
| ✅ | 2-1 | `POST /api/events` — イベント作成 | src/server/routes/events.ts |
| ✅ | 2-2 | `GET /api/events/admin/:adminToken` — 管理用取得 | src/server/routes/events.ts |
| ✅ | 2-3 | `GET /api/events/share/:shareToken` — 共有用取得 | src/server/routes/events.ts |
| ✅ | 2-4 | `POST /api/events/share/:shareToken/participants` — 回答送信 | src/server/routes/events.ts |
| ✅ | 2-5 | `PATCH /api/events/admin/:adminToken/confirm` — 確定日決定 | src/server/routes/events.ts |
| ✅ | 2-6 | index.ts にルートを登録・`/api/hello` を削除 | src/server/index.ts |

---

## フェーズ 3 : フロントエンド基盤

| 状態 | # | タスク | 対象ファイル |
|------|---|--------|------------|
| ✅ | 3-1 | fetch ラッパー（各 API 呼び出し関数） | src/client/lib/api.ts |

---

## フェーズ 4 : イベント作成ページ（`/`）

| 状態 | # | タスク | 対象ファイル |
|------|---|--------|------------|
| ✅ | 4-1 | イベント名入力フォーム | src/client/pages/create-event.tsx |
| ✅ | 4-2 | 候補日入力（3〜5個） | src/client/pages/create-event.tsx |
| ✅ | 4-3 | バリデーション（名前必須・候補日 3 個以上） | src/client/pages/create-event.tsx |
| ✅ | 4-4 | 送信処理・完了後に管理用・共有用リンクを表示 | src/client/pages/create-event.tsx |

---

## フェーズ 5 : 参加者ページ（`/event/:shareToken`）

| 状態 | # | タスク | 対象ファイル |
|------|---|--------|------------|
| ✅ | 5-1 | イベント情報取得・表示（名前・候補日・確定日） | src/client/pages/event.tsx |
| ✅ | 5-2 | 確定日が決まっている場合の表示分岐 | src/client/pages/event.tsx |
| ✅ | 5-3 | 名前入力フォーム | src/client/pages/event.tsx |
| ✅ | 5-4 | 候補日ごとの ◯/△/× 選択 UI | src/client/pages/event.tsx |
| ✅ | 5-5 | 回答送信処理・送信完了メッセージ表示 | src/client/pages/event.tsx |

---

## フェーズ 6 : 管理ページ（`/admin/:adminToken`）

| 状態 | # | タスク | 対象ファイル |
|------|---|--------|------------|
| ✅ | 6-1 | イベント情報取得・候補日一覧表示 | src/client/pages/admin.tsx |
| ✅ | 6-2 | 参加者回答一覧テーブル（行: 参加者、列: 候補日） | src/client/pages/admin.tsx |
| ✅ | 6-3 | 候補日ごとの ◯ 人数集計表示 | src/client/pages/admin.tsx |
| ✅ | 6-4 | 確定日の選択・送信処理 | src/client/pages/admin.tsx |
| ✅ | 6-5 | 確定済み状態の表示（確定後は選択 UI を非表示） | src/client/pages/admin.tsx |
| ✅ | 6-6 | 共有用リンクのコピー機能 | src/client/pages/admin.tsx |
