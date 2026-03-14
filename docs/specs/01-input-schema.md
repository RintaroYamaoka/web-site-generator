# 入力スキーマ仕様

サイト生成の入力として、フロントから送信するデータの形を定義する。実装時は `packages/shared` の型定義と一致させる。**仮ページ駆動フロー**に合わせ、ページ数（1〜5）・サイト説明・各ページのセクション内容・必須文言を中心とする。この入力から LLM が「マークダウン形式の仮ページ」を生成する。

## 概要

ユーザーが入力するのは次の 4 つを中心とする。

1. **ページ数** … 1 から 5 の範囲で選択
2. **何のサイトか** … サイトの目的・業種・対象者などの説明
3. **各ページのセクション内容** … ページごとの見出し・本文の意図・構成
4. **必ず入れてほしい文言** … 会社名・キャッチコピー・法的表記など

## スキーマ（案）

```ts
// ページ数は 1 〜 5
type PageCount = 1 | 2 | 3 | 4 | 5;

// 1 ページあたりのセクション定義（ユーザーが入力）
interface PageSectionInput {
  title?: string;      // セクション見出しの意図
  content?: string;   // 本文の内容・意図・キーワード
  order?: number;     // 表示順
}

// ページごとの入力（ページ数に応じて 1 〜 5 件）
interface PageInput {
  path: string;       // 例: "/", "/about", "/services"
  name: string;       // 表示名: "トップ", "会社概要"
  sections: PageSectionInput[];
}

// 必ず入れてほしい文言（自由テキストのリストまたは key-value）
interface RequiredCopy {
  label?: string;     // 例: "会社名", "キャッチコピー"
  text: string;       // 実際の文言
}

// メインの入力スキーマ
interface SiteGenerationInput {
  // ページ数（1〜5）
  pageCount: PageCount;

  // 何のサイトか（目的・業種・対象者など）
  siteDescription: string;

  // 各ページの構成（pageCount に応じた件数）
  pages: PageInput[];

  // 必ず入れてほしい文言
  requiredCopy: RequiredCopy[];

  // オプション: プロジェクト名（Vercel や URL に使う）
  projectName?: string;
}
```

## バリデーション方針

- `pageCount` は 1 以上 5 以下。`pages` の長さと一致させる。
- `siteDescription` は必須、最大文字数は別途 UI 仕様で定義。
- `pages` の各要素に少なくとも 1 件は `/` を含むページ（トップ）があること。
- `requiredCopy` は 0 件以上。同一 label は許容するが、実装側でどう扱うかは仕様書生成の責務とする。
- `projectName` は省略時は自動生成。Vercel の制約に合わせてサニタイズする。

## 今後の拡張候補

- テーマ・雰囲気の選択（既存の image/preset の考え方を必要に応じて復活）
- 多言語対応（`locale`）
- 画像の指定（URL またはキーワード）

## 関連

- [生成パイプライン（仕様書生成→実装）](./02-generation-pipeline.md)
- [マークダウン形式の仮ページ（フォーマット）](./04-markdown-spec-format.md)
- [ディレクトリ構造](../architecture/01-directory-structure.md)
