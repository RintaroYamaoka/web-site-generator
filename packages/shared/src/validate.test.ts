import { describe, it, expect } from "vitest";
import { validateSiteGenerationInput } from "./validate.js";

const validInput = {
  pageCount: 1,
  pages: [
    {
      path: "/",
      name: "トップ",
      sections: [
        { heading: "見出し", content: "本文", headingMode: "as_is", contentMode: "complement" },
      ],
      heroSection: true,
    },
  ],
  designPreference: "おまかせ",
};

describe("validateSiteGenerationInput", () => {
  it("有効な入力なら null を返す", () => {
    expect(validateSiteGenerationInput(validInput)).toBeNull();
  });

  it("null ならエラーメッセージを返す", () => {
    expect(validateSiteGenerationInput(null)).not.toBeNull();
  });

  it("pageCount が 0 ならエラー", () => {
    expect(validateSiteGenerationInput({ ...validInput, pageCount: 0 })).not.toBeNull();
  });

  it("pageCount が 6 ならエラー", () => {
    expect(validateSiteGenerationInput({ ...validInput, pageCount: 6 })).not.toBeNull();
  });

  it("pages の長さが pageCount と一致しないならエラー", () => {
    expect(validateSiteGenerationInput({ ...validInput, pageCount: 2 })).not.toBeNull();
  });

  it("path が / のページが無いならエラー", () => {
    const noRoot = {
      ...validInput,
      pages: [{ ...validInput.pages[0], path: "/top" }],
    };
    expect(validateSiteGenerationInput(noRoot)).not.toBeNull();
  });

  it("designPreference が文字列でないならエラー", () => {
    expect(validateSiteGenerationInput({ ...validInput, designPreference: 1 })).not.toBeNull();
  });

  it("sections が空ならエラー", () => {
    const noSections = {
      ...validInput,
      pages: [{ ...validInput.pages[0], sections: [] }],
    };
    expect(validateSiteGenerationInput(noSections)).not.toBeNull();
  });
});
