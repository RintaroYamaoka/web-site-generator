"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function ResultContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url");
  const spec = searchParams.get("spec");

  if (!url) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4">
        <p className="text-[var(--muted)] mb-4">URL がありません</p>
        <Link href="/" className="text-sm text-[var(--accent)] hover:underline">トップへ</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-xl font-light tracking-widest text-[var(--fg)] mb-6">作成完了</h1>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--accent)] break-all hover:underline mb-2 max-w-md text-center"
      >
        {url}
      </a>
      <div className="flex gap-4 mt-6">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 border border-[var(--accent)] text-[var(--fg)] text-sm hover:bg-white/5 rounded-sm"
        >
          開く
        </a>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(url)}
          className="px-4 py-2 border border-[var(--accent)] text-[var(--fg)] text-sm hover:bg-white/5 rounded-sm"
        >
          コピー
        </button>
      </div>
      {spec && (
        <a
          href={`data:text/markdown;base64,${btoa(unescape(encodeURIComponent(spec)))}`}
          download="spec.md"
          className="mt-6 text-xs text-[var(--muted)] hover:text-[var(--fg)]"
        >
          仕様書をダウンロード
        </a>
      )}
      <Link href="/" className="mt-8 text-sm text-[var(--muted)] hover:underline">トップへ</Link>
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">読み込み中…</div>}>
      <ResultContent />
    </Suspense>
  );
}
