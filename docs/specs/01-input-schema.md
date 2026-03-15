# 入力スキーマ仕様

UI が送信する入力の形を定義する。実装時は `packages/shared` の型定義と一致させる。**ロジック**がこのスキーマを唯一の入力に、1 本のマークダウン（ページ構成仕様＋仮ページ）を組み立てる。

## 概要

UI で入力する項目は次のとおり。

1. **ページ数** … 1 〜 5
2. **各ページ**
   - パス・ページ名
   - **セクション数**（またはセクション配列の長さ）
   - **各セクション**: 見出し、内容（テキスト or おまかせ）、画像（添付 or テキスト指定 or おまかせ）
3. **必須文言** … 会社名・キャッチコピーなど
4. **デザイン希望** … 文言で指定 or おまかせ

おまかせの場合は、ロジックが仮ページに [04 の固定文言の正式定義](./04-markdown-spec-format.md#固定文言の正式定義) に従った文字列を入れる。

## スキーマ（案）

```ts
// 画像の指定方法
type ImageSpecType = "attach" | "text" | "omakase";

interface ImageSpec {
  type: ImageSpecType;
  value?: string;    // text のとき: 説明・キーワード。後で生成する場合の指示
  fileRef?: string;  // attach のとき: UI が付与した ref（例: "image_1"）
}

// 1 セクションの入力
interface SectionInput {
  heading: string;           // セクション見出し
  content: string;          // 本文。おまかせのときは空 or 専用値（ロジックが "AIにおまかせ" 等に置換）
  contentOmakase?: boolean; // true なら内容はおまかせ → ロジックが固定テキストを入れる
  image?: ImageSpec;        // 省略可。attach=添付, text=テキストで指定, omakase=おまかせ
}

// 1 ページの入力
interface PageInput {
  path: string;       // 例: "/", "/about"
  name: string;       // 表示名: "トップ", "会社概要"
  sections: SectionInput[];  // セクション数 = length。順序は配列順
}

// 必須文言
interface RequiredCopy {
  label?: string;
  text: string;
}

// デザイン希望（おまかせあり）
type DesignPreference = string;  // 例: "ミニマル", "コーポレート", "おまかせ" 等

// メインの入力スキーマ
interface SiteGenerationInput {
  pageCount: 1 | 2 | 3 | 4 | 5;
  siteDescription?: string;   // 何のサイトか（任意）
  pages: PageInput[];
  requiredCopy: RequiredCopy[];
  designPreference: DesignPreference;  // デザイン希望。おまかせのときは "おまかせ"
  projectName?: string;
}
```

## バリデーション方針

- `pageCount` と `pages.length` を一致させる。
- 少なくとも 1 ページは `path === "/"` とする。
- `sections` は 1 ページあたり 1 件以上。上限は別途 UI で定義可。
- `contentOmakase === true` のとき、ロジックは `content` を無視し、[04 の固定文言](./04-markdown-spec-format.md#固定文言の正式定義)（セクション本文おまかせ）を仮ページに書く。
- `image.type === "attach"` のときは `fileRef` を必須とする。UI は添付ファイルに ref を付与し、パイプラインが LLM に渡す際に実体を紐付ける。
- `designPreference` は必須。空の場合は `"おまかせ"` とする等、UI で規定する。

## ロジックとの契約

- ロジックは **このスキーマだけ** を入力とする。LLM は呼ばない。
- 出力は **1 本のマークダウン**（ページ構成の仕様＋仮ページ）。フォーマットは [04](./04-markdown-spec-format.md) に従う。
- 画像はマークダウン上では ref または決め文言（`画像: おまかせ`、`画像: 〇〇`）として記述する。実体の解決は LLM 入力時または後段で行う。

## 関連

- [マークダウン形式の仕様書（1 本の構成）](./04-markdown-spec-format.md)
- [生成パイプライン](./02-generation-pipeline.md)
- [生成サイトの技術仕様](./07-generated-site-tech-spec.md)
- [ディレクトリ構造](../architecture/01-directory-structure.md)
