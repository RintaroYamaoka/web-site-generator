import type { SiteGenerationInput, SectionInput, ImageSpec } from "@web-site-generator/shared";
import {
  CONTENT_OMAKASE_PLACEHOLDER,
  IMAGE_OMAKASE_PLACEHOLDER,
} from "@web-site-generator/shared";

/**
 * 入力スキーマから 1 本のマークダウン（仕様＋仮ページ）を生成する。04 仕様に準拠。
 */
export function buildMarkdown(input: SiteGenerationInput): string {
  const specPart = buildSpecPart(input);
  const virtualPagesPart = buildVirtualPagesPart(input);
  return `${specPart}\n\n---\n\n${virtualPagesPart}`;
}

function buildSpecPart(input: SiteGenerationInput): string {
  const lines: string[] = ["# ページ構成仕様", ""];
  if (input.siteDescription?.trim()) {
    lines.push("## サイト概要", "", input.siteDescription.trim(), "");
  }
  lines.push("## ページ一覧", "");
  lines.push("| パス | 名前 | セクション数 | ヒーロー |");
  lines.push("|------|------|-------------|--------|");
  for (const p of input.pages) {
    const hero = p.heroSection ? "あり" : "なし";
    lines.push(`| ${p.path} | ${p.name} | ${p.sections.length} | ${hero} |`);
  }
  lines.push("", "## デザイン希望", "", input.designPreference || "おまかせ");
  const requiredCopy = (input.requiredCopy?.length ? input.requiredCopy : [])
    .concat(
      input.headerContent?.text?.trim() ? [{ text: input.headerContent.text, label: "共通ヘッダー" }] : [],
      input.footerContent?.text?.trim() ? [{ text: input.footerContent.text, label: "共通フッター" }] : []
    )
    .filter((c) => c.text?.trim());
  lines.push("", "## 必須文言（共通ヘッダー・フッター含む）", "");
  for (const c of requiredCopy) {
    const label = c.label ? `${c.label}: ` : "";
    lines.push(`- ${label}${c.text}`);
  }
  if (input.headerContent?.text?.trim())
    lines.push("", "## 共通ヘッダー内容", "", input.headerContent.text);
  if (input.footerContent?.text?.trim())
    lines.push("", "## 共通フッター内容", "", input.footerContent.text);
  lines.push("", "## 画像指定", "");
  for (const p of input.pages) {
    p.sections.forEach((s, i) => {
      if (s.image) {
        const label = `${p.name} セクション${i + 1}`;
        if (s.image.type === "attach" && s.image.fileRef)
          lines.push(`- ${label}: 添付 (ref: ${s.image.fileRef})`);
        else if (s.image.type === "text" && s.image.value)
          lines.push(`- ${label}: テキスト指定 (${s.image.value})`);
        else if (s.image.type === "omakase") lines.push(`- ${label}: おまかせ`);
      }
    });
  }
  return lines.join("\n");
}

function buildVirtualPagesPart(input: SiteGenerationInput): string {
  const lines: string[] = ["# 仮ページ", ""];
  for (const p of input.pages) {
    lines.push(`# ${p.name} (${p.path})`, "");
    if (p.heroSection && p.sections.length > 0) {
      const hero = p.sections[0];
      lines.push("## ヒーローセクション（このページの最初のセクション）", "");
      lines.push(`見出し: ${hero.heading || "（未入力）"}`, "");
      const body = hero.contentOmakase ? CONTENT_OMAKASE_PLACEHOLDER : hero.content;
      if (body) lines.push(body, "");
      const imgLine = formatImagePlaceholder(hero);
      if (imgLine) lines.push(imgLine, "");
      lines.push("");
      for (let i = 1; i < p.sections.length; i++) {
        const s = p.sections[i];
        lines.push(`## ${s.heading}`, "");
        const body2 = s.contentOmakase ? CONTENT_OMAKASE_PLACEHOLDER : s.content;
        if (body2) lines.push(body2, "");
        const imgLine2 = formatImagePlaceholder(s);
        if (imgLine2) lines.push(imgLine2, "");
        lines.push("");
      }
    } else {
      for (const s of p.sections) {
        lines.push(`## ${s.heading}`, "");
        const body = s.contentOmakase ? CONTENT_OMAKASE_PLACEHOLDER : s.content;
        if (body) lines.push(body, "");
        const imgLine = formatImagePlaceholder(s);
        if (imgLine) lines.push(imgLine, "");
      }
      lines.push("");
    }
  }
  return lines.join("\n");
}

function formatImagePlaceholder(section: SectionInput): string {
  if (!section.image) return "";
  const img = section.image as ImageSpec;
  if (img.type === "attach" && img.fileRef)
    return `![ref:${img.fileRef}](添付画像)`;
  if (img.type === "text" && img.value) return `画像: ${img.value}`;
  if (img.type === "omakase") return IMAGE_OMAKASE_PLACEHOLDER;
  return "";
}
