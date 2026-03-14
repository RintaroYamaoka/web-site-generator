# Web サイト制作代行 — デモサイト自動生成

ユーザーが「ざっくりした内容・ページ構成・イメージ」を入力すると、Next.js のデモサイトを自動生成し、Vercel にデプロイして URL を返すプロジェクトです。

## 開発の進め方（ドキュメント駆動）

**設計と仕様はコードより先にドキュメントで決めます。**

- 全体の進め方・ドキュメント索引: **[docs/README.md](./docs/README.md)**
- 目標・要件: [docs/requirements/](./docs/requirements/)
- アーキテクチャ・ディレクトリ設計: [docs/architecture/](./docs/architecture/)
- 詳細仕様（API・入力・生成・デプロイ）: [docs/specs/](./docs/specs/)
- 技術決定（ADR）: [docs/decisions/](./docs/decisions/)

新規で開発するときは、上記の順でドキュメントを読み、`docs/` を正として実装してください。

## ディレクトリ構造（予定）

```
├── docs/              # 設計・要件・仕様（正）
├── apps/
│   ├── web/           # ユーザー向け Web UI
│   └── api/           # （必要なら）生成・デプロイ API
├── packages/
│   ├── core/          # サイト生成エンジン
│   ├── deploy/        # Vercel デプロイ連携
│   └── shared/        # 共通型・ユーティリティ
├── templates/
│   └── next-demo/     # デモ用 Next.js テンプレート
└── scripts/           # ビルド・デプロイ・検証スクリプト
```

詳細は [docs/architecture/01-directory-structure.md](./docs/architecture/01-directory-structure.md) を参照してください。

## 目標の要約

1. ユーザーが内容・ページ構成・イメージを入力 → **Next.js のハイクオリティなデモサイトを自動生成**
2. 生成サイトを **Vercel に自動デプロイ**
3. ユーザーが **生成された URL** でデモを閲覧可能にする

## セットアップ（今後）

- Node.js 18+
- pnpm（モノレポ）
- Vercel トークン（デプロイ用）

実装が進んだ時点で、この README にセットアップ手順を追記します。
