import type { SiteGenerationInput } from "./types.js";

/**
 * 01 バリデーション方針に基づく検証。不正ならエラーメッセージを返す。
 */
export function validateSiteGenerationInput(input: unknown): string | null {
  if (!input || typeof input !== "object") return "入力が不正です";
  const o = input as Record<string, unknown>;
  if (typeof o.pageCount !== "number" || o.pageCount < 1 || o.pageCount > 5)
    return "pageCount は 1〜5 です";
  if (!Array.isArray(o.pages)) return "pages は配列です";
  if (o.pages.length !== o.pageCount) return "pageCount と pages.length が一致しません";
  const hasRoot = o.pages.some(
    (p: { path?: string }) => p && typeof p === "object" && p.path === "/"
  );
  if (!hasRoot) return "少なくとも 1 ページは path が / である必要があります";
  // requiredCopy は省略可（UI は headerContent/footerContent で送るため）。undefined のときは空配列扱い
  if (o.requiredCopy !== undefined && !Array.isArray(o.requiredCopy)) return "requiredCopy は配列です";
  if (typeof o.designPreference !== "string") return "designPreference は文字列です";
  for (let i = 0; i < o.pages.length; i++) {
    const p = o.pages[i] as Record<string, unknown>;
    if (!Array.isArray(p.sections) || p.sections.length < 1)
      return `ページ ${i + 1} の sections は 1 件以上必要です`;
  }
  return null;
}
