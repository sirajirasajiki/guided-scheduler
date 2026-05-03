import { Link, useLocation } from "react-router-dom";

export default function Footer() {
  const location = useLocation();
  return (
    <footer className="mt-6 py-3 text-center text-xs text-gray-400 space-x-4">
      <Link
        to="/terms"
        state={{ from: location.pathname }}
        className="hover:underline hover:text-gray-600"
      >
        利用規約
      </Link>
      <Link
        to="/privacy"
        state={{ from: location.pathname }}
        className="hover:underline hover:text-gray-600"
      >
        プライバシーポリシー
      </Link>
      <Link
        to="/faq"
        state={{ from: location.pathname }}
        className="hover:underline hover:text-gray-600"
      >
        よくある質問
      </Link>
    </footer>
  );
}
