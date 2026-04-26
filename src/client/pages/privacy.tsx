import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <div className="flex-1 bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="mb-4">
          <Link to="/" className="text-sm text-blue-600 hover:underline">
            ← トップに戻る
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow p-8 space-y-6 text-sm text-gray-700 leading-relaxed">
          <h1 className="text-2xl font-bold text-gray-800">
            プライバシーポリシー
          </h1>

          <p>
            本プライバシーポリシー(以下「本ポリシー」)は、本サービス(以下「本サービス」)における個人情報および利用者情報の取り扱いについて定めるものです。
          </p>

          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-2">
              第1条(取得する情報)
            </h2>
            <p className="mb-2">本サービスでは、以下の情報を取得します。</p>
            <ol className="list-decimal list-outside pl-5 space-y-2">
              <li>
                <span className="font-medium">利用者が入力する情報</span>
                <ul className="list-disc list-outside pl-5 mt-1 space-y-1 font-normal">
                  <li>イベント名、候補日</li>
                  <li>参加者名(ニックネーム可)</li>
                  <li>日程回答(◯/△/×)</li>
                  <li>アレルギー情報</li>
                </ul>
              </li>
              <li>
                <span className="font-medium">自動的に取得する情報</span>
                <ul className="list-disc list-outside pl-5 mt-1 space-y-1 font-normal">
                  <li>
                    アクセスログ(IPアドレス、ユーザーエージェント、リファラー、アクセス日時)
                  </li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-2">
              第2条(情報の利用目的)
            </h2>
            <p className="mb-2">取得した情報は、以下の目的で利用します。</p>
            <ol className="list-decimal list-outside pl-5 space-y-1">
              <li>本サービスの提供および運営</li>
              <li>本サービスの改善</li>
              <li>不正利用の防止および対応</li>
              <li>利用状況の分析(集計・統計化された形での利用)</li>
              <li>法令に基づく対応</li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-2">
              第3条(情報の第三者提供)
            </h2>
            <ol className="list-decimal list-outside pl-5 space-y-1">
              <li>
                運営者は、利用者の同意なく第三者に個人情報を提供しません。ただし、法令に基づく場合、または人の生命・身体・財産の保護のために必要な場合を除きます。
              </li>
              <li>
                本サービスはURLを知る第三者から情報が閲覧可能な仕組みを採用しています。入力情報がURL共有先から閲覧されることを、利用者は了承するものとします。
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-2">
              第4条(情報の保管期間)
            </h2>
            <ol className="list-decimal list-outside pl-5 space-y-1">
              <li>利用者が入力した情報は、運営者が定める期間保管されます。</li>
              <li>
                運営者は、本サービスの運営上不要となった情報を予告なく削除する場合があります。
              </li>
              <li>利用者は、必要な情報は自己の責任で別途保存してください。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-2">
              第5条(アクセス解析ツールの利用)
            </h2>
            <p>
              本サービスは、利用状況の把握のためCloudflare Web
              Analyticsを利用しています。このツールはCookieを使用せず、個人を特定する情報を収集しません。
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-2">
              第6条(セキュリティ)
            </h2>
            <p>
              運営者は、取得した情報の漏洩・滅失・毀損の防止に努めます。ただし、インターネット上の通信の完全な安全性を保証するものではありません。
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-2">
              第7条(アレルギー情報の取り扱い)
            </h2>
            <ol className="list-decimal list-outside pl-5 space-y-1">
              <li>
                アレルギー情報は、管理画面において個人を特定できない匿名集計の形式で表示されます。
              </li>
              <li>
                本サービスは医療目的の情報管理ツールではありません。重篤なアレルギーを持つ方は、店舗・幹事との直接確認を行うことを強く推奨します。
              </li>
              <li>
                アレルギー情報の取り扱いに起因する事故・損害について、運営者は責任を負いません。
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-2">
              第8条(データの削除について)
            </h2>
            <p>
              入力されたデータの削除時期は保証されません。DBのリセット等、運営上の都合により予告なく削除される場合があります。
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-2">
              第9条(本ポリシーの変更)
            </h2>
            <ol className="list-decimal list-outside pl-5 space-y-1">
              <li>
                運営者は、必要と判断した場合に、利用者への事前通知なく本ポリシーを変更することがあります。
              </li>
              <li>
                変更後の本ポリシーは、本サービス上に掲載した時点から効力を生じます。
              </li>
            </ol>
          </section>

          <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
            制定日: 2026年4月26日 最終更新日: 2026年4月26日
          </p>
        </div>
      </div>
    </div>
  );
}
