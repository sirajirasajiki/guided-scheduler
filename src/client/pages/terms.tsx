import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <div className="flex-1 bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="mb-4">
          <Link to="/" className="text-sm text-blue-600 hover:underline">
            ← トップに戻る
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow p-8 space-y-6 text-sm text-gray-700 leading-relaxed">
          <h1 className="text-2xl font-bold text-gray-800">利用規約</h1>

          <p>
            本利用規約(以下「本規約」)は、本サービス(以下「本サービス」)の提供条件および本サービスの利用に関する条件を定めるものです。本サービスをご利用になる方(以下「利用者」)は、本規約に同意したものとみなします。
          </p>

          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-2">
              第1条(本サービスの内容)
            </h2>
            <ol className="list-decimal list-outside pl-5 space-y-1">
              <li>
                本サービスは、飲み会・イベント等の日程調整および参加者のアレルギー情報共有を目的としたWebアプリケーションです。
              </li>
              <li>本サービスは、個人が開発・運用しています。</li>
              <li>
                本サービスは、利用者登録(アカウント登録)を必要とせず、URLベースで利用可能な仕組みを採用しています。
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-2">
              第2条(利用料金)
            </h2>
            <ol className="list-decimal list-outside pl-5 space-y-1">
              <li>本サービスは、現時点では無料で提供されます。</li>
              <li>
                運営者は、将来的に本サービスの仕様、提供方法、料金体系を変更する場合があります。
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-2">
              第3条(サービスの提供および変更・終了)
            </h2>
            <ol className="list-decimal list-outside pl-5 space-y-1">
              <li>運営者は、本サービスを継続的に提供する義務を負いません。</li>
              <li>
                運営者は、予告なく本サービスの全部または一部を変更、停止、終了することがあります。
              </li>
              <li>
                本サービスの停止・終了によって利用者に発生したいかなる損害についても、運営者は責任を負いません。
              </li>
              <li>
                データの保持についても保証されません。利用者は、必要なデータは自己の責任で別途保存してください。
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-2">
              第4条(利用者の責任)
            </h2>
            <ol className="list-decimal list-outside pl-5 space-y-1">
              <li>
                利用者は、自己の責任において本サービスを利用するものとします。
              </li>
              <li>
                利用者が本サービスに入力した情報(イベント名、参加者名、回答内容、アレルギー情報等)は、本サービスのURLを知る第三者から閲覧される可能性があることを、利用者は了承します。
              </li>
              <li>
                利用者は、本サービスに以下の情報を入力しないでください。
                <ul className="list-disc list-outside pl-5 mt-1 space-y-1">
                  <li>機密情報</li>
                  <li>第三者の権利を侵害する情報</li>
                  <li>法令に違反する情報</li>
                  <li>本人の同意を得ていない第三者の個人情報</li>
                </ul>
              </li>
              <li>
                アレルギー情報の取り扱いについて、本サービスは医療的な助言を行うものではありません。アレルギー対応については、最終的に利用者および店舗の判断と責任に委ねられます。
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-2">
              第5条(禁止事項)
            </h2>
            <p className="mb-2">
              利用者は、本サービスの利用にあたり、以下の行為を行ってはなりません。
            </p>
            <ol className="list-decimal list-outside pl-5 space-y-1">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>
                運営者または第三者の知的財産権、肖像権、プライバシー権、名誉、その他の権利または利益を侵害する行為
              </li>
              <li>
                本サービスのサーバー、ネットワーク、プログラムへの不正アクセス、過度な負荷をかける行為
              </li>
              <li>
                本サービスを通じて、または本サービスに関連して、運営者または第三者に不利益、損害、不快感を与える行為
              </li>
              <li>本サービスの不具合を意図的に利用する行為</li>
              <li>その他、運営者が不適切と判断する行為</li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-2">
              第6条(免責事項)
            </h2>
            <ol className="list-decimal list-outside pl-5 space-y-1">
              <li>
                本サービスは「現状有姿」で提供されます。運営者は、本サービスの完全性、正確性、有用性、特定目的への適合性、その他いかなる事項についても保証しません。
              </li>
              <li>
                本サービスの利用または利用不能から生じたいかなる損害についても、運営者は一切の責任を負いません。
              </li>
              <li>
                本サービスを通じて行われた利用者間または利用者と第三者間のトラブルについて、運営者は関与せず、責任を負いません。
              </li>
              <li>
                利用者が入力した情報の漏洩、改ざん、消失等が発生した場合であっても、運営者の故意または重過失による場合を除き、運営者は責任を負いません。
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-2">
              第7条(知的財産権)
            </h2>
            <ol className="list-decimal list-outside pl-5 space-y-1">
              <li>
                本サービスのソースコードはMITライセンスのもとで公開されています。
              </li>
              <li>
                本サービスを通じて利用者が入力した情報の著作権その他の権利は、利用者または正当な権利者に帰属します。
              </li>
              <li>
                利用者は、本サービスの運営に必要な範囲で、入力情報を運営者が使用することに同意します。
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-2">
              第8条(個人情報の取り扱い)
            </h2>
            <p>
              個人情報の取り扱いについては、別途定める
              <a
                href="https://guided-scheduler.sirajira.workers.dev/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-800"
              >
                プライバシーポリシー
              </a>
              に従います。
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-2">
              第9条(本規約の変更)
            </h2>
            <ol className="list-decimal list-outside pl-5 space-y-1">
              <li>
                運営者は、必要と判断した場合に、利用者への事前通知なく本規約を変更することがあります。
              </li>
              <li>
                変更後の本規約は、本サービス上に掲載した時点から効力を生じます。
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-2">
              第10条(準拠法および管轄)
            </h2>
            <ol className="list-decimal list-outside pl-5 space-y-1">
              <li>本規約の解釈にあたっては、日本法を準拠法とします。</li>
              <li>
                本サービスに関して紛争が生じた場合には、東京地方裁判所を専属的合意管轄裁判所とします。
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
