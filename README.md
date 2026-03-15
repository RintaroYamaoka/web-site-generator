# Web サイト制作代行 — デモサイト自動生成

ユーザーが「ざっくりした内容・ページ構成・イメージ」を入力すると、Next.js のデモサイトを自動生成し、Vercel にデプロイして URL を返すプロジェクトです。

**開発はドキュメント駆動。** 設計・仕様および開発フロー・原則は **[docs/](docs/)** に集約している。まず [docs/README.md](docs/README.md) と [docs/development/workflow.md](docs/development/workflow.md) を参照すること。

---

## 開発フロー（原則・手順）

- **正は docs/** … 要件は [requirements/](docs/requirements/)、アーキテクチャは [architecture/](docs/architecture/)、詳細仕様は [specs/](docs/specs/)。コードはこれらに合わせて実装する。
- **変更は doc ファースト** … 挙動・仕様を変えるときは **① 該当 docs を参照 → ② 仕様を更新 → ③ 実装**の順で行う。「実装してからドキュメントを合わせる」は本流ではない。
- **ディレクトリ・パッケージの変更** … 追加・役割変更時は [architecture/01-directory-structure.md](docs/architecture/01-directory-structure.md) を先に更新してから実装する。
- **分割してテストしながら実装** … 一気に実装せず、仕様の範囲を切って「実装 → 確認・テスト」を繰り返す。詳細は [development/lessons-learned.md](docs/development/lessons-learned.md) を参照。

参照順（実装・レビュー時）: [workflow.md の「参照順」](docs/development/workflow.md#参照順実装レビュー時) に従う。

---

## ユーザーストーリー（要約）

| ストーリー | 内容 |
|------------|------|
| **US-1** | サイト内容の入力（ページ数・セクション・画像・必須文言・デザイン希望） |
| **US-2** | ロジックで 1 本のマークダウン（仕様＋仮ページ）を生成 |
| **US-3** | LLM が仕様書を読み、Next.js サイトのソースコードを生成 |
| **US-4** | 生成成果物で Git リポジトリを作成 |
| **US-5** | Vercel への自動デプロイ |
| **US-6** | 生成 URL での閲覧 |

詳細・受け入れ条件は [requirements/01-user-stories.md](docs/requirements/01-user-stories.md)。

---

## 学び・開発フロー記録

- **学び・振り返り** … [development/lessons-learned.md](docs/development/lessons-learned.md) に「一気に実装せず分割してテストしながら進める」推奨とチェックリストを記録。
- **設計〜実装の経緯** … [00-development-flow-record.md](docs/00-development-flow-record.md) にフェーズ概要・実装開始時の参照順・チェックリストを記載。

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

## 依存関係・責務分離

モジュール間の依存は**一方向**にし、**循環依存は禁止**。パッケージの役割は次のとおり。

| パッケージ | 責務 | 依存してよいもの |
|------------|------|------------------|
| **shared** | 入力スキーマ型・定数・入力検証 | なし |
| **deploy** | 生成物ディレクトリのビルド・Git・Vercel デプロイ | なし |
| **core** | 検証・マークダウン生成・LLM・ファイル出力・deploy 呼び出し | shared, deploy |
| **web** | フォーム UI・下書き永続化・生成 API のエントリ | shared（型）, core（API 内のみ） |

**依存の向き**: `shared` / `deploy` は他パッケージに依存しない → `core` が shared と deploy に依存 → `apps/web` が shared と core（API ルート内）に依存。core はクライアントバンドルには含めない。

詳細は [02-system-architecture.md（パッケージ依存関係と責務）](docs/architecture/02-system-architecture.md#パッケージ依存関係と責務) を参照。

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
