"use client";

const DOT_COUNT = 32;

export default function BackgroundAnimation() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute inset-0 bg-[var(--bg)]" />
      {/* 下から上へゆっくり流れるドット：スクリーンセーバー風・無機質でAIチック */}
      <div className="absolute inset-0">
        {Array.from({ length: DOT_COUNT }, (_, i) => (
          <div
            key={i}
            className="bg-screensaver-dot"
            style={{
              left: `${(i * 13 + 2) % 100}%`,
              bottom: 0,
              animationDelay: `${(i * 0.7) % 28}s`,
              animationDuration: `${24 + (i % 6)}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
