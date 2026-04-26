import { useState } from "react";
import { api } from "../lib/api";
import type { CreateEventResponse } from "../../shared/types";

const MIN_DATES = 3;
const MAX_DATES = 5;

export default function CreateEvent() {
  const [name, setName] = useState("");
  const [dates, setDates] = useState<string[]>(["", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateEventResponse | null>(null);
  const [copied, setCopied] = useState<"admin" | "share" | null>(null);

  function updateDate(index: number, value: string) {
    setDates((prev) => prev.map((d, i) => (i === index ? value : d)));
  }

  function addDate() {
    if (dates.length < MAX_DATES) setDates((prev) => [...prev, ""]);
  }

  function removeDate(index: number) {
    if (dates.length > MIN_DATES) {
      setDates((prev) => prev.filter((_, i) => i !== index));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const filledDates = dates.filter((d) => d !== "");
    if (filledDates.length < MIN_DATES) {
      setError(`候補日を ${MIN_DATES} 個以上入力してください`);
      return;
    }

    setLoading(true);
    try {
      const res = await api.createEvent({ name: name.trim(), candidateDates: filledDates });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard(text: string, type: "admin" | "share") {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  if (result) {
    const adminUrl = `${location.origin}/admin/${result.adminToken}`;
    const shareUrl = `${location.origin}/event/${result.shareToken}`;
    return (
      <div className="flex-1 bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-green-600 mb-2">イベントを作成しました</h1>
          <p className="text-gray-500 text-sm mb-6">以下のリンクを保管してください</p>

          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">管理用リンク（幹事専用）</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={adminUrl}
                className="flex-1 text-sm border rounded-lg px-3 py-2 bg-gray-50 text-gray-700"
              />
              <button
                onClick={() => copyToClipboard(adminUrl, "admin")}
                className="text-sm px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {copied === "admin" ? "コピー済" : "コピー"}
              </button>
            </div>
          </div>

          <div className="mb-8">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">共有用リンク（参加者に送る）</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 text-sm border rounded-lg px-3 py-2 bg-gray-50 text-gray-700"
              />
              <button
                onClick={() => copyToClipboard(shareUrl, "share")}
                className="text-sm px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                {copied === "share" ? "コピー済" : "コピー"}
              </button>
            </div>
          </div>

          <a
            href={`/admin/${result.adminToken}`}
            className="block text-center w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            管理ページへ →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">イベント作成</h1>
        <p className="text-gray-500 text-sm mb-6">日程調整イベントを作成します</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              イベント名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 5月の飲み会"
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              候補日（{MIN_DATES}〜{MAX_DATES} 個）
            </label>
            <div className="space-y-2">
              {dates.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="date"
                    value={d}
                    onChange={(e) => updateDate(i, e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {dates.length > MIN_DATES && (
                    <button
                      type="button"
                      onClick={() => removeDate(i)}
                      className="text-gray-400 hover:text-red-500 text-lg leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            {dates.length < MAX_DATES && (
              <button
                type="button"
                onClick={addDate}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                ＋ 候補日を追加
              </button>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <p className="text-xs text-gray-500 text-center">
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700">利用規約</a>および
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700">プライバシーポリシー</a>
            に同意の上、作成してください。
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {loading ? "作成中..." : "イベントを作成"}
          </button>
        </form>
      </div>
    </div>
  );
}
