export default function LoadingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <p className="text-[var(--muted)] text-sm mb-8">サイトを生成しています。しばらくお待ちください。</p>
      <div className="w-24 h-24 border border-[var(--accent)]/50 rounded-full animate-pulse" aria-hidden />
    </main>
  );
}
