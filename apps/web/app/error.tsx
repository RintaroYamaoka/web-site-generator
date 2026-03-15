"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-xl font-light tracking-widest text-[var(--fg)] mb-4">
        エラーが発生しました
      </h1>
      <p className="text-[var(--muted)] text-sm mb-8 max-w-md text-center">
        {error.message || "予期しないエラーです。"}
      </p>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => reset()}
          className="px-6 py-3 border border-[var(--accent)] text-[var(--fg)] text-sm tracking-wider hover:bg-white/5 transition-colors"
        >
          再試行
        </button>
        <Link
          href="/"
          className="px-6 py-3 border border-[var(--accent)]/50 text-[var(--muted)] text-sm tracking-wider hover:bg-white/5 transition-colors"
        >
          トップへ
        </Link>
      </div>
    </main>
  );
}
