import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { GetEventAdminResponse, ResponseValue } from "../../shared/types";
import { ALLERGEN_LIST } from "../../shared/types";

const LABELS: Record<ResponseValue, string> = { o: "◯", d: "△", x: "×" };
const CELL_COLORS: Record<ResponseValue, string> = {
  o: "text-green-600 font-bold",
  d: "text-yellow-600",
  x: "text-red-500",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" });
}

export default function Admin() {
  const { adminToken } = useParams<{ adminToken: string }>();
  const [event, setEvent] = useState<GetEventAdminResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function load() {
    if (!adminToken) return;
    api.getEventAdmin(adminToken)
      .then(setEvent)
      .catch((err) => setFetchError(err instanceof Error ? err.message : "読み込みに失敗しました"));
  }

  useEffect(() => { load(); }, [adminToken]);

  async function handleConfirm(date: string) {
    setConfirmError(null);
    setConfirmLoading(true);
    try {
      await api.confirmDate(adminToken!, { date });
      const updated = await api.getEventAdmin(adminToken!);
      setEvent(updated);
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "確定に失敗しました");
    } finally {
      setConfirmLoading(false);
    }
  }

  async function copyShareLink() {
    if (!event) return;
    // TODO(prod): GetEventAdminResponse に shareToken を含めることを検討
    const url = location.href;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (fetchError) {
    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center p-4">
        <p className="text-red-500">{fetchError}</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center p-4">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    );
  }

  // 候補日ごとの ◯ 人数
  const countO = (date: string) =>
    event.participants.filter((p) => p.responses[date] === "o").length;

  // アレルギー集計
  const allergyCountMap: Record<string, number> = {};
  const otherAllergyCountMap: Record<string, number> = {};
  for (const p of event.participants) {
    if (!p.allergies) continue;
    for (const item of p.allergies.items) {
      allergyCountMap[item] = (allergyCountMap[item] ?? 0) + 1;
    }
    for (const item of p.allergies.otherItems ?? []) {
      otherAllergyCountMap[item] = (otherAllergyCountMap[item] ?? 0) + 1;
    }
  }
  const hasAnyAllergy =
    Object.keys(allergyCountMap).length > 0 || Object.keys(otherAllergyCountMap).length > 0;

  return (
    <div className="flex-1 bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">{event.name}</h1>
          <p className="text-gray-500 text-sm">管理ページ</p>

          {event.confirmedDate && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 font-medium">
                ✅ 確定日：{new Date(event.confirmedDate).toLocaleDateString("ja-JP", {
                  year: "numeric", month: "long", day: "numeric", weekday: "short"
                })}
              </p>
            </div>
          )}
        </div>

        {/* 回答一覧テーブル */}
        <div className="bg-white rounded-2xl shadow p-6 overflow-x-auto">
          <h2 className="text-base font-semibold text-gray-700 mb-4">
            回答一覧（{event.participants.length} 名）
          </h2>

          {event.participants.length === 0 ? (
            <p className="text-gray-400 text-sm">まだ回答がありません</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left text-gray-500 font-medium pb-2 pr-4">名前</th>
                  {event.candidateDates.map((d) => (
                    <th key={d} className="text-center text-gray-500 font-medium pb-2 px-2 min-w-[64px]">
                      {formatDate(d)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {event.participants.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="py-2 pr-4 text-gray-800 font-medium">{p.name}</td>
                    {event.candidateDates.map((d) => {
                      const v = p.responses[d] as ResponseValue | undefined;
                      return (
                        <td key={d} className={`py-2 px-2 text-center ${v ? CELL_COLORS[v] : "text-gray-300"}`}>
                          {v ? LABELS[v] : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* 集計行 */}
                <tr className="border-t-2 border-gray-300">
                  <td className="py-2 pr-4 text-gray-500 text-xs">◯ 合計</td>
                  {event.candidateDates.map((d) => (
                    <td key={d} className="py-2 px-2 text-center text-green-600 font-bold text-sm">
                      {countO(d)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* 確定日選択 */}
        {!event.confirmedDate && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-base font-semibold text-gray-700 mb-4">確定日を選択</h2>
            <div className="space-y-2">
              {event.candidateDates.map((d) => (
                <div key={d} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-800">
                      {new Date(d).toLocaleDateString("ja-JP", {
                        year: "numeric", month: "long", day: "numeric", weekday: "short"
                      })}
                    </span>
                    <span className="ml-2 text-xs text-green-600 font-medium">
                      ◯ {countO(d)} 名
                    </span>
                  </div>
                  <button
                    onClick={() => handleConfirm(d)}
                    disabled={confirmLoading}
                    className="text-sm px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    この日に確定
                  </button>
                </div>
              ))}
            </div>
            {confirmError && <p className="mt-2 text-sm text-red-500">{confirmError}</p>}
          </div>
        )}

        {/* アレルギー情報 */}
        {hasAnyAllergy && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-base font-semibold text-gray-700 mb-1">アレルギー情報</h2>
            <p className="text-xs text-gray-400 mb-4">個人が特定されないよう、品目と人数のみ表示しています</p>
            <ul className="space-y-2">
              {ALLERGEN_LIST.filter((item) => allergyCountMap[item] > 0).map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                  <span className="text-sm text-gray-700">
                    {item}アレルギーあり（{allergyCountMap[item]}名）
                  </span>
                </li>
              ))}
              {Object.entries(otherAllergyCountMap).map(([text, count]) => (
                <li key={text} className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                  <span className="text-sm text-gray-700">
                    その他: {text}（{count}名）
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 共有リンク */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-2">共有リンクのコピー</h2>
          <p className="text-xs text-gray-500 mb-3">
            参加者に送る共有リンクはイベント作成完了画面に表示されています。<br />
            このページのURLは管理用です。参加者には共有しないでください。
          </p>
          <button
            onClick={copyShareLink}
            className="text-sm px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
          >
            {copied ? "コピー済み" : "管理ページURLをコピー"}
          </button>
        </div>
      </div>
    </div>
  );
}
