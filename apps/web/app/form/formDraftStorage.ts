/**
 * フォーム下書きの localStorage 読み書き（docs/specs/09-generator-ui-spec.md）。
 * ストレージを差し替え可能にしてテストする。
 */
import type { PageInput, CommonBlockInput, TextMode } from "@web-site-generator/shared";

export const FORM_DRAFT_KEY = "web-site-generator-form-draft";

export type FormDraft = {
  siteDescription: CommonBlockInput & { mode: TextMode };
  pageCount: 1 | 2 | 3 | 4 | 5;
  headerContent: CommonBlockInput & { mode: TextMode };
  footerContent: CommonBlockInput & { mode: TextMode };
  pages: PageInput[];
  designPreference: CommonBlockInput & { mode: TextMode };
};

export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function isValidDraft(d: unknown): d is FormDraft {
  if (!d || typeof d !== "object") return false;
  const o = d as Record<string, unknown>;
  const n = o.pageCount;
  if (typeof n !== "number" || n < 1 || n > 5) return false;
  if (!Array.isArray(o.pages) || o.pages.length !== n) return false;
  if (!o.siteDescription || !o.headerContent || !o.footerContent || !o.designPreference) return false;
  return true;
}

/**
 * ストレージから下書きを読み取る。無効なデータや未設定の場合は null。
 */
export function loadDraft(storage: DraftStorage): FormDraft | null {
  try {
    const raw = storage.getItem(FORM_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidDraft(parsed)) return null;
    const pages = (parsed.pages as PageInput[]).map((p, pi) => ({
      ...p,
      path: pi === 0 ? "/" : `/page-${pi + 1}`,
    }));
    return { ...parsed, pages };
  } catch {
    return null;
  }
}

/**
 * ストレージに下書きを書き込む。
 */
export function saveDraft(storage: DraftStorage, draft: FormDraft): void {
  try {
    storage.setItem(FORM_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // クォータ超過・プライベートモードなどは呼び出し元で扱う
  }
}
