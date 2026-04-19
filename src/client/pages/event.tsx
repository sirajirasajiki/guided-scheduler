import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { GetEventShareResponse, ResponseValue, AllergyInfo } from "../../shared/types";
import { ALLERGEN_LIST } from "../../shared/types";

const LABELS: Record<ResponseValue, string> = { o: "◯", d: "△", x: "×" };
const COLORS: Record<ResponseValue, string> = {
  o: "bg-green-100 text-green-700 border-green-400",
  d: "bg-yellow-100 text-yellow-700 border-yellow-400",
  x: "bg-red-100 text-red-700 border-red-400",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
}

export default function Event() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [event, setEvent] = useState<GetEventShareResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [responses, setResponses] = useState<Record<string, ResponseValue>>({});

  // アレルギー状態
  const [hasAllergy, setHasAllergy] = useState(false);
  const [selectedAllergens, setSelectedAllergens] = useState<Set<string>>(new Set());
  const [otherChecked, setOtherChecked] = useState(false);
  const [otherText, setOtherText] = useState("");

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!shareToken) return;
    api.getEventShare(shareToken)
      .then(setEvent)
      .catch((err) => setFetchError(err instanceof Error ? err.message : "読み込みに失敗しました"));
  }, [shareToken]);

  function setResponse(date: string, value: ResponseValue) {
    setResponses((prev) => ({ ...prev, [date]: value }));
  }

  function toggleAllergen(item: string) {
    setSelectedAllergens((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  function buildAllergyInfo(): AllergyInfo | undefined {
    if (!hasAllergy) return undefined;
    const items = Array.from(selectedAllergens);
    const otherItems = otherChecked
      ? otherText.split(/[,，、]/).map((s) => s.trim()).filter(Boolean)
      : [];
    if (items.length === 0 && otherItems.length === 0) return undefined;
    return { items, otherItems };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!name.trim()) {
      setSubmitError("名前を入力してください");
      return;
    }
    const missing = event!.candidateDates.filter((d) => !responses[d]);
    if (missing.length > 0) {
      setSubmitError("すべての候補日に回答してください");
      return;
    }

    setLoading(true);
    try {
      await api.submitParticipant(shareToken!, {
        name: name.trim(),
        responses,
        allergies: buildAllergyInfo(),
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-red-500">{fetchError}</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-gray-400">読み込み中...</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-8 w-full max-w-md text-center">
          <p className="text-4xl mb-4">✅</p>
          <h2 className="text-xl font-bold text-gray-800 mb-2">回答を送信しました</h2>
          <p className="text-gray-500 text-sm">ご協力ありがとうございます</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">{event.name}</h1>

        {event.confirmedDate ? (
          <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 font-medium">
              ✅ 確定日：{formatDate(event.confirmedDate)}
            </p>
          </div>
        ) : (
          <p className="text-gray-500 text-sm mb-6">候補日への参加可否を回答してください</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 山田太郎"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">候補日への回答</p>
            <div className="space-y-3">
              {event.candidateDates.map((date) => (
                <div key={date} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{formatDate(date)}</span>
                  <div className="flex gap-2">
                    {(["o", "d", "x"] as ResponseValue[]).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setResponse(date, v)}
                        className={`w-10 h-10 rounded-lg border-2 text-base font-bold transition-all ${
                          responses[date] === v
                            ? COLORS[v]
                            : "bg-white border-gray-200 text-gray-400 hover:border-gray-400"
                        }`}
                      >
                        {LABELS[v]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* アレルギー情報 */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasAllergy}
                onChange={(e) => setHasAllergy(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">アレルギーがありますか？</span>
            </label>

            {hasAllergy && (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-gray-500">該当するものをすべて選択してください</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {ALLERGEN_LIST.map((item) => (
                    <label key={item} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAllergens.has(item)}
                        onChange={() => toggleAllergen(item)}
                        className="w-4 h-4 accent-blue-600"
                      />
                      <span className="text-sm text-gray-700">{item}</span>
                    </label>
                  ))}
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={otherChecked}
                    onChange={(e) => setOtherChecked(e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">その他</span>
                  <span className="text-xs text-gray-400">例: 松の実, マンゴー</span>
                </label>

                {otherChecked && (
                  <input
                    type="text"
                    value={otherText}
                    onChange={(e) => setOtherText(e.target.value)}
                    placeholder="例: 松の実, マンゴー"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            )}
          </div>

          {event.restaurants.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">店候補</p>
              <div className="space-y-2">
                {event.restaurants.map((r) => (
                  <div
                    key={r.id}
                    className="border border-gray-200 rounded-lg p-3"
                  >
                    <p className="text-sm font-medium text-gray-800">{r.name}</p>
                    {r.memo && <p className="text-xs text-gray-500">{r.memo}</p>}
                    {r.url && (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline break-all"
                      >
                        {r.url}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {submitError && <p className="text-sm text-red-500">{submitError}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {loading ? "送信中..." : "回答を送信"}
          </button>
        </form>
      </div>
    </div>
  );
}
