/**
 * 入力スキーマ（docs/specs/01-input-schema.md）
 */
export type ImageSpecType = "attach" | "text" | "omakase";

export type TextMode = "omakase" | "complement" | "as_is";
export type ImageMode = "omakase" | "attach" | "none";

export interface ImageSpec {
  type: ImageSpecType;
  value?: string;
  fileRef?: string;
}

export interface SectionInput {
  heading: string;
  content: string;
  contentOmakase?: boolean;
  /** 見出し: AIおまかせ / AI補完 / 入力そのまま */
  headingMode?: TextMode;
  /** 本文: AIおまかせ / AI補完 / 入力そのまま */
  contentMode?: TextMode;
  image?: ImageSpec;
}

export interface PageInput {
  path: string;
  name: string;
  /** ページ名: AIおまかせ / AI補完 / 入力そのまま */
  nameMode?: TextMode;
  sections: SectionInput[];
  /** ヒーローセクションありの場合、最初のセクションをヒーロー用にする */
  heroSection?: boolean;
}

/** 共通ヘッダー／フッターの1項目（テキスト＋モード） */
export interface CommonBlockInput {
  text: string;
  mode?: TextMode;
}

export interface RequiredCopy {
  label?: string;
  text: string;
}

export type DesignPreference = string;

export type PageCount = 1 | 2 | 3 | 4 | 5;

export interface SiteGenerationInput {
  pageCount: PageCount;
  siteDescription?: string;
  /** 共通ヘッダー内容（必須文言はここで扱う） */
  headerContent?: CommonBlockInput;
  /** 共通フッター内容 */
  footerContent?: CommonBlockInput;
  pages: PageInput[];
  requiredCopy?: RequiredCopy[];
  designPreference: DesignPreference;
  projectName?: string;
}
