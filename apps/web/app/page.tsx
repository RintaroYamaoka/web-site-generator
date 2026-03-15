import Link from "next/link";

export default function TopPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative">
        <h1 className="text-2xl font-light tracking-widest text-[var(--fg)] mb-4">
          WEB SITE GENERATOR
        </h1>
        <p className="text-[var(--muted)] text-sm mb-10 max-w-md text-center">
          作りたいページ数と、各ページに載せたい見出し・文章を入力するだけ。
          <br />
          数分でWebサイトのURLを生成。
        </p>
        <Link
          href="/form"
          className="px-8 py-3 border border-[var(--accent)] text-[var(--fg)] text-sm tracking-wider hover:bg-white/5 transition-colors"
        >
          Webサイトを作成
        </Link>
      </main>
  );
}
