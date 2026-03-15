"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") ?? "エラーが発生しました";
  const code = searchParams.get("code");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-xl font-light tracking-widest text-[var(--fg)] mb-4">エラー</h1>
      <p className="text-[var(--muted)] text-sm mb-2 max-w-md text-center">{error}</p>
      {code && <p className="text-xs text-[var(--muted)]/80 mb-8">code: {code}</p>}
      <div className="flex gap-4">
        <Link href="/form" className="px-4 py-2 border border-[var(--accent)] text-[var(--fg)] text-sm hover:bg-white/5 rounded-sm">
          リトライ
        </Link>
        <Link href="/" className="px-4 py-2 border border-[var(--accent)]/50 text-[var(--muted)] text-sm hover:bg-white/5 rounded-sm">
          トップへ
        </Link>
      </div>
    </main>
  );
}

export default function ErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">読み込み中…</div>}>
      <ErrorContent />
    </Suspense>
  );
}
