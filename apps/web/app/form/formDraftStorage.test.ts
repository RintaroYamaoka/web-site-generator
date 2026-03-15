import { describe, it, expect, beforeEach } from "vitest";
import {
  FORM_DRAFT_KEY,
  loadDraft,
  saveDraft,
  isValidDraft,
  type FormDraft,
  type DraftStorage,
} from "./formDraftStorage";

function createMockStorage(): DraftStorage {
  const map = new Map<string, string>();
  return {
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

const validDraft: FormDraft = {
  siteDescription: { text: "テストサイト", mode: "complement" },
  pageCount: 1,
  headerContent: { text: "ヘッダー", mode: "as_is" },
  footerContent: { text: "フッター", mode: "as_is" },
  pages: [
    {
      path: "/",
      name: "トップ",
      sections: [
        {
          heading: "見出し",
          content: "本文",
          headingMode: "as_is",
          contentMode: "complement",
          image: { type: "omakase" },
        },
      ],
      heroSection: true,
    },
  ],
  designPreference: { text: "シンプル", mode: "omakase" },
};

describe("formDraftStorage", () => {
  let storage: DraftStorage;

  beforeEach(() => {
    storage = createMockStorage();
  });

  describe("isValidDraft", () => {
    it("有効な下書きを true と判定する", () => {
      expect(isValidDraft(validDraft)).toBe(true);
    });

    it("null を false と判定する", () => {
      expect(isValidDraft(null)).toBe(false);
    });

    it("pageCount が 0 のとき false", () => {
      expect(isValidDraft({ ...validDraft, pageCount: 0 })).toBe(false);
    });

    it("pageCount が 6 のとき false", () => {
      expect(isValidDraft({ ...validDraft, pageCount: 6 })).toBe(false);
    });

    it("pages の長さが pageCount と一致しないとき false", () => {
      expect(isValidDraft({ ...validDraft, pages: [] })).toBe(false);
    });

    it("必須フィールドが欠けているとき false", () => {
      const bad = { ...validDraft, siteDescription: undefined } as unknown;
      expect(isValidDraft(bad)).toBe(false);
    });
  });

  describe("saveDraft / loadDraft", () => {
    it("保存した下書きを読み込める", () => {
      saveDraft(storage, validDraft);
      const loaded = loadDraft(storage);
      expect(loaded).not.toBeNull();
      expect(loaded!.siteDescription.text).toBe(validDraft.siteDescription.text);
      expect(loaded!.pageCount).toBe(validDraft.pageCount);
      expect(loaded!.pages[0].path).toBe("/");
    });

    it("何も保存していないとき loadDraft は null", () => {
      expect(loadDraft(storage)).toBeNull();
    });

    it("無効な JSON を保存したあと loadDraft は null", () => {
      storage.setItem(FORM_DRAFT_KEY, "invalid json");
      expect(loadDraft(storage)).toBeNull();
    });

    it("無効な形のデータを保存したあと loadDraft は null", () => {
      storage.setItem(FORM_DRAFT_KEY, JSON.stringify({ pageCount: 1, pages: [] }));
      expect(loadDraft(storage)).toBeNull();
    });
  });
});
