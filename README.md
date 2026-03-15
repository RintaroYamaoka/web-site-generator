# Web サイト制作代行 — デモサイト自動生成

ユーザーが「ざっくりした内容・ページ構成・イメージ」を入力すると、Next.js のデモサイトを自動生成し、Vercel にデプロイして URL を返すプロジェクトです。

**開発はドキュメント駆動。** 設計・仕様および開発フロー・原則は **[docs/](docs/)** に集約している。まず [docs/README.md](docs/README.md) と [docs/development/workflow.md](docs/development/workflow.md) を参照すること。

---

## リポジトリ・デプロイの前提

- **本リポジトリ（サイトジェネレーター）**: **パブリック** を想定。
- **生成するサイト**（ツールが出力するデモ用サイト・そのリポジトリ）: **プライベート** を想定（[05 仕様](docs/specs/05-github-repo.md)）。

---

## ディレクトリ構造

```
├── docs/              # 設計・要件・仕様・開発フロー（正）
├── apps/web/          # ユーザー向け Web UI
├── packages/          # core, deploy, shared
├── templates/         # next-demo（現行フローでは未使用）
└── scripts/
```

詳細は [docs/architecture/01-directory-structure.md](docs/architecture/01-directory-structure.md)。

---

## 目標の要約

1. ユーザーが内容・ページ構成・イメージを入力 → **Next.js のデモサイトを自動生成**
2. 生成サイトを **Vercel に自動デプロイ**
3. ユーザーが **生成された URL** でデモを閲覧可能にする

---

## セットアップ・実行

- **Node.js 18+** / **pnpm**

```bash
pnpm install
pnpm dev
```

起動後、**ターミナルに表示された URL**（例: `http://localhost:3000` や `http://localhost:3001`）をブラウザで開く。ポート 3000 が他で使われていると Next は 3001 で起動するため、**表示された URL をそのまま使う**こと（別のアドレスだと HTML だけ表示されスタイルが当たらない場合がある）。`pnpm build` でビルド。

### 環境変数

サイトを**実際に生成・デプロイ**するには、ルートに `.env` を作成する。

| 変数 | 必須 | 取得方法 |
|------|------|----------|
| **GEMINI_API_KEY** | 生成時に必須 | [Google AI Studio](https://aistudio.google.com/) → Get API key |
| **VERCEL_TOKEN** | デプロイ時に必須 | [Vercel](https://vercel.com/account/tokens) → Create Token |

`.env.example` をコピーして `.env` にし、値を埋める。未設定のまま「サイト作成」すると API がエラーを返す。
