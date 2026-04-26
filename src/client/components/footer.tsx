export default function Footer() {
  return (
    <footer className="mt-6 py-3 text-center text-xs text-gray-400 space-x-4">
      <a
        href="/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline hover:text-gray-600"
      >
        利用規約
      </a>
      <a
        href="/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline hover:text-gray-600"
      >
        プライバシーポリシー
      </a>
    </footer>
  );
}
