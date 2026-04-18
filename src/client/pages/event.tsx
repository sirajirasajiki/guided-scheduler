import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { GetEventShareResponse, ResponseValue } from "../../shared/types";

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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [votedRestaurantId, setVotedRestaurantId] = useState<string | null>(null);
  const [voteLoading, setVoteLoading] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [voteSuccess, setVoteSuccess] = useState(false);

  useEffect(() => {
    if (!shareToken) return;
    api.getEventShare(shareToken)
      .then(setEvent)
      .catch((err) => setFetchError(err instanceof Error ? err.message : "読み込みに失敗しました"));
  }, [shareToken]);

  function setResponse(date: string, value: ResponseValue) {
    setResponses((prev) => ({ ...prev, [date]: value }));
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
      await api.submitParticipant(shareToken!, { name: name.trim(), responses });
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

  async function handleVote(restaurantId: string) {
    setVoteError(null);
    setVoteLoading(true);
    setVotedRestaurantId(restaurantId);
    try {
      await api.voteRestaurant(shareToken!, { participantName: name.trim(), restaurantId });
      setVoteSuccess(true);
      // 最新の投票数を反映するためイベント再取得
      const updated = await api.getEventShare(shareToken!);
      setEvent(updated);
    } catch (err) {
      setVoteError(err instanceof Error ? err.message : "投票に失敗しました");
      setVotedRestaurantId(null);
    } finally {
      setVoteLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <p className="text-4xl mb-4">✅</p>
            <h2 className="text-xl font-bold text-gray-800 mb-2">回答を送信しました</h2>
            <p className="text-gray-500 text-sm">ご協力ありがとうございます</p>
          </div>

          {event && event.restaurants.length > 0 && (
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-1">行きたい店に投票しよう</h3>
              <p className="text-xs text-gray-400 mb-4">1人1票・後から変更可</p>
              {voteSuccess ? (
                <p className="text-sm text-green-600 font-medium text-center">
                  投票しました！
                </p>
              ) : (
                <div className="space-y-2">
                  {event.restaurants.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleVote(r.id)}
                      disabled={voteLoading}
                      className={`w-full text-left border rounded-lg p-3 transition-all disabled:opacity-50 ${
                        votedRestaurantId === r.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{r.name}</p>
                          {r.memo && <p className="text-xs text-gray-500">{r.memo}</p>}
                        </div>
                        <span className="text-xs text-gray-400 ml-2">{r.voteCount} 票</span>
                      </div>
                    </button>
                  ))}
                  {voteError && <p className="text-sm text-red-500">{voteError}</p>}
                </div>
              )}
            </div>
          )}
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

        {event.restaurants.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">店候補</p>
            <ul className="space-y-2">
              {event.restaurants.map((r) => (
                <li key={r.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-800">{r.name}</p>
                    <span className="text-xs text-gray-400">{r.voteCount} 票</span>
                  </div>
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
                  {r.memo && (
                    <p className="text-xs text-gray-500 mt-1">{r.memo}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
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
