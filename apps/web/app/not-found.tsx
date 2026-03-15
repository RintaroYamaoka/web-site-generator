import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-xl font-light tracking-widest text-[var(--fg)] mb-2">
        404
      </h1>
      <p className="text-[var(--muted)] text-sm mb-8">ページが見つかりません</p>
      <Link
        href="/"
        className="px-6 py-3 border border-[var(--accent)] text-[var(--fg)] text-sm tracking-wider hover:bg-white/5 rounded-sm"
      >
        トップへ
      </Link>
    </main>
  );
}
