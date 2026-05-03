import { Link, useLocation } from "react-router-dom";

const faqs: { q: string; a: string }[] = [
  {
    q: "データはいつ削除されますか？",
    a: "毎月1日 18:00 UTC（日本時間では毎月2日 3:00）に、最新の候補日から30日以上経過したイベントのデータが自動的に削除されます。",
  },
  {
    q: "回答を修正・上書きできますか？",
    a: "はい。参加者の回答フォームで同じ名前を入力して再送信すると、以前の回答が自動的に上書きされます。",
  },
  {
    q: "イベントや参加者データを手動で削除できますか？",
    a: "現在、手動での削除機能は提供していません。データは自動削除のタイミングで消去されます。管理用URLを他者に知らせないよう管理することで、不要なアクセスを防いでください。",
  },
  {
    q: "管理用URLを紛失した場合はどうすればよいですか？",
    a: "現在、管理用URLの再発行機能は提供していません。イベント作成時に表示された管理用URLを大切に保管してください。",
  },
  {
    q: "確定日を変更することはできますか？",
    a: "現在、一度確定した日程の変更には対応していません。変更が必要な場合は、新しいイベントを作成し直してください。",
  },
  {
    q: "何人まで参加できますか？",
    a: "参加人数に上限はありません。",
  },
  {
    q: "このサービスは無料ですか？",
    a: "現時点では無料でご利用いただけます。将来的に変更される可能性があります。詳しくは利用規約をご確認ください。",
  },
];

export default function Faq() {
  const location = useLocation();
  const backTo = (location.state as { from?: string } | null)?.from ?? "/";
  return (
    <div className="flex-1 bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="mb-4">
          <Link to={backTo} className="text-sm text-blue-600 hover:underline">
            ← 戻る
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow p-8 space-y-6 text-sm text-gray-700 leading-relaxed">
          <h1 className="text-2xl font-bold text-gray-800">よくある質問</h1>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <section key={index} className="space-y-1">
                <h2 className="text-base font-semibold text-gray-800">
                  Q. {faq.q}
                </h2>
                <p className="pl-4 text-gray-600">A. {faq.a}</p>
              </section>
            ))}
          </div>

          <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
            最終更新日: 2026年5月2日
          </p>
        </div>
      </div>
    </div>
  );
}
