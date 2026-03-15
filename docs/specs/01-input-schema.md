# 入力スキーマ仕様

UI が送信する入力の形を定義する。実装時は `packages/shared` の型定義と一致させる。**ロジック**がこのスキーマを唯一の入力に、1 本のマークダウン（ページ構成仕様＋仮ページ）を組み立てる。

## 概要

UI で入力する項目は次のとおり。

1. **サイト概要** … 何のサイトか（任意）。仕様書の先頭付近に「サイト概要」として含める。
2. **共通ヘッダー・共通フッター** … 全ページ共通のヘッダー／フッター内容。必須文言として仕様書に含める。
3. **ページ数** … 1 〜 5
4. **各ページ**
   - パス・ページ名（各項目で AI おまかせ / 補完 / 入力そのままを選択可）
   - **セクション**（動的追加・削除）。各セクション: 見出し・本文・画像（添付 / テキスト / おまかせ / なし）。1 つ目をヒーローとするかは `heroSection` で指定。
5. **デザイン希望** … 文言で指定 or おまかせ

おまかせの場合は、ロジックが仮ページに [04 の固定文言の正式定義](./04-markdown-spec-format.md#固定文言の正式定義) に従った文字列を入れる。

## スキーマ（実装: packages/shared の型定義と一致させる）

```ts
// テキストの扱い: おまかせ / AI補完 / 入力そのまま
type TextMode = "omakase" | "complement" | "as_is";
// 画像の指定方法（UI では "none" も使用）
type ImageMode = "omakase" | "attach" | "none";
type ImageSpecType = "attach" | "text" | "omakase";

interface ImageSpec {
  type: ImageSpecType;
  value?: string;    // text のとき: 説明・キーワード
  fileRef?: string;  // attach のとき: UI が付与した ref（例: "section_0_0"）
}

interface SectionInput {
  heading: string;
  content: string;
  contentOmakase?: boolean;  // true なら本文はおまかせ → ロジックが固定文言を入れる
  headingMode?: TextMode;    // 見出し: おまかせ / 補完 / そのまま
  contentMode?: TextMode;    // 本文: おまかせ / 補完 / そのまま
  image?: ImageSpec;
}

interface PageInput {
  path: string;       // 例: "/", "/page-2"
  name: string;       // 表示名: "トップ", "会社概要"
  nameMode?: TextMode;
  sections: SectionInput[];
  heroSection?: boolean;     // true の場合、最初のセクションをヒーロー用にする
}

/** 共通ヘッダー／フッターの 1 項目（UI でテキスト＋モードを送る） */
interface CommonBlockInput {
  text: string;
  mode?: TextMode;
}

interface RequiredCopy {
  label?: string;
  text: string;
}

type DesignPreference = string;  // 例: "ミニマル", "コーポレート", "おまかせ"

interface SiteGenerationInput {
  pageCount: 1 | 2 | 3 | 4 | 5;
  siteDescription?: string;
  headerContent?: CommonBlockInput;   // 共通ヘッダー。必須文言として仕様書に含める
  footerContent?: CommonBlockInput;   // 共通フッター
  pages: PageInput[];
  requiredCopy?: RequiredCopy[];     // 省略可。UI は headerContent/footerContent で送り、ロジックが必須文言を組み立てる
  designPreference: DesignPreference;
  projectName?: string;
}
```

## バリデーション方針（packages/shared validateSiteGenerationInput）

- `pageCount` と `pages.length` を一致させる。
- 少なくとも 1 ページは `path === "/"` とする。
- `sections` は 1 ページあたり 1 件以上。上限は [09 UI 仕様](./09-generator-ui-spec.md#セクション上限ui-側) で規定。
- `requiredCopy` は **省略可能**。UI は `headerContent` / `footerContent` を送り、ロジック（buildMarkdown）が必須文言を組み立てる。省略時は未送信として扱い、配列でない場合のみエラーとする。
- `contentOmakase === true` のとき、ロジックは `content` を無視し、[04 の固定文言](./04-markdown-spec-format.md#固定文言の正式定義)（セクション本文おまかせ）を仮ページに書く。
- `image.type === "attach"` のときは `fileRef` を必須とする。UI は添付ファイルに ref を付与し、パイプラインが LLM に渡す際に実体を紐付ける。
- `designPreference` は必須（文字列）。空の場合は `"おまかせ"` とする等、UI で規定する。

## ロジックとの契約

- ロジックは **このスキーマだけ** を入力とする。LLM は呼ばない。
- 出力は **1 本のマークダウン**（ページ構成の仕様＋仮ページ）。フォーマットは [04](./04-markdown-spec-format.md) に従う。
- 画像はマークダウン上では ref または決め文言（`画像: おまかせ`、`画像: 〇〇`）として記述する。実体の解決は LLM 入力時または後段で行う。

## 実装との対応

- **型定義** … `packages/shared/src/types.ts`。本仕様を変更する場合は先に本ドキュメントを更新し、続けて型・バリデーション・UI を合わせる。
- **バリデーション** … `packages/shared/src/validate.ts` の `validateSiteGenerationInput`。
- **仕様書組み立て** … `packages/core/src/buildMarkdown.ts`（入力 → 1 本マークダウン）。

## 関連

- [マークダウン形式の仕様書（1 本の構成）](./04-markdown-spec-format.md)
- [生成パイプライン](./02-generation-pipeline.md)
- [生成サイトの技術仕様](./07-generated-site-tech-spec.md)
- [ディレクトリ構造](../architecture/01-directory-structure.md)
