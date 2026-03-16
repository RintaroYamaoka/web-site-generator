# Vercel デプロイ仕様

生成された Next.js プロジェクトを Vercel にデプロイし、URL を取得する手順と責務を定義する。実装は `packages/deploy` が担当する。

## 目的

- ローカルまたはサーバー上の「生成済み Next.js ディレクトリ」を Vercel にデプロイする。
- デプロイ完了後に **本番 URL** を返し、Web UI でユーザーに表示する。

## 入力・出力

- **入力**  
  - 生成済み Next.js プロジェクトのディレクトリパス（または ZIP のパス）。  
  - オプション: プロジェクト名、Vercel の Team ID / Project の上書き指定。
- **出力**  
  - 成功時: `{ url: string; projectId?: string; ... }`  
  - 失敗時: `{ error: string; details?: unknown }`

## 実装方針（ロジックでデプロイ）

**デプロイは CLI ではなくロジック（Vercel REST API）で行う。**

- **Vercel REST API** を用い、生成ディレクトリのファイルを `POST /v13/deployments` の `files` にインラインで送信する。
- ローカルでの `npm install` / `npm run build` / `git init` / `npx vercel` は行わない。Vercel 側でビルドが実行される。
- メリット: サーバーレス環境（Vercel Functions）で `child_process` を使わず、純粋な HTTP 呼び出しのみで完結する。タイムアウト・ハングのリスクを減らせる。

## GitHub 連携（push）について

- 初版の運用では、**生成されたサイトの GitHub リポジトリ作成・push は必須ではない**（オプション）。
- GitHub へ push しない場合でも、**ディレクトリから直接 Vercel にデプロイして URL を返す**運用は成立する。
- GitHub に push しない運用のトレードオフ:
  - **メリット**: 必要なトークンが減り（`GITHUB_TOKEN` 不要）、構成が単純で導入が速い
  - **デメリット**: 生成物のソースが GitHub に残らない（差分管理・再デプロイ・手直しの導線が弱い）

## デプロイターゲット（Preview / Production）

- 生成サイトを Vercel に載せて **URL を返すこと**が目的なので、初版では **Preview デプロイでも可**とする（`vercel` / `vercel --prod` のどちらでも URL は得られる）。
- 運用上・アカウント設定上の理由で Production が弾かれる場合があるため、実装では **ターゲットを切り替え可能**にする。
  - 既定: **Preview**（`vercel`）
  - 明示的に Production にしたい場合のみ **Production**（`vercel --prod`）

## 環境変数・認証

- `VERCEL_TOKEN`: デプロイに使う Vercel のトークン（必須）。
- `VERCEL_DEPLOY_TARGET`: `preview` / `production`（任意）。未指定は `preview`。
- `SKIP_BUILD_VERIFY`: `1` にするとデプロイ前のローカルビルド検証をスキップ。**本アプリを Vercel にデプロイしている場合は `VERCEL=1` により自動スキップ**（サーバーレスの `/tmp` が 512MB に制限され、`npm install` で ENOSPC になるため）。
- `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`: 既存プロジェクトにデプロイする場合に指定。未指定の場合は新規プロジェクトとして作成する方針とする。
- これらはリポジトリに含めず、ルートの `.env.example` に変数名だけ記載する。実行時は環境変数から読み込む（ユーザー設定でトークンを登録する拡張は別仕様）。

## デプロイフロー（REST API）

1. **.npmrc 付与** … Vercel サンドボックスで `npm install` が `/home/sbx_user*` にキャッシュを作ろうとして ENOENT になるのを防ぐため、`cache=/tmp/.npm-cache` を設定した `.npmrc` をプロジェクトルートに書き込む。
2. **ファイル収集** … 生成ディレクトリから `package.json`, `.npmrc`, `app/`, `public/`, `next.config.*`, `tailwind.config.*`, `tsconfig.json`, `postcss.config.*` 等を再帰的に読み取り、`{ file: 相対パス, data: 内容, encoding: "utf-8"|"base64" }` の配列を構築する。`node_modules`, `.git`, `.next` は除外。
3. **ビルド検証（オプション）** … `SKIP_BUILD_VERIFY` が未設定の場合、ローカルで `npm install` → `npm run build` を実行し、失敗時はビルドログをエラーとして返す（BUILD_ERROR の早期検出・詳細表示）。成功後は `node_modules` / `.next` を除外して再収集。
4. **デプロイ作成** … `POST https://api.vercel.com/v13/deployments` に `name`（一意、例: `gen-${timestamp}`）、`files`、`target: "preview"` を送信。
5. **完了待機** … レスポンスの `id` で `GET /v13/deployments/:id` をポーリングし、`readyState === "READY"` または `readyState === "ERROR"` になるまで待つ。タイムアウト（例: 5 分）を設ける。
6. **URL 返却** … `readyState === "READY"` なら `url` を返す。`ERROR` なら `errorMessage` / `errorStep` / `errorCode` をエラーメッセージに含めて返す。

## エラーハンドリング

- ネットワークエラー・認証エラー（401/403）・ビルド失敗（Vercel 側）は、呼び出し元がメッセージをユーザーに表示できる形で返す。
- エラーコード: `CONFIG_ERROR`（トークン未設定）、`INVALID_PROJECT`（package.json なし）、`DEPLOY_ERROR`（API 失敗・ビルド失敗・タイムアウト）。

## 関連

- [生成パイプライン仕様](./02-generation-pipeline.md)
- [GitHub リポジトリ自動作成・プッシュ](./05-github-repo.md)
- [システムアーキテクチャ](../architecture/02-system-architecture.md)

## モノレポ（workspace）での注意

- `apps/web` は `@web-site-generator/*` を workspace 依存しているため、デプロイ環境で `apps/web` だけを `next build` すると、依存パッケージの `dist/` が存在せず **Module not found** になる場合がある。
- 対策: `apps/web` のビルド前に `packages/*` の `build`（`tsc`）を実行する（例: `pnpm -r --filter @web-site-generator/shared --filter @web-site-generator/deploy --filter @web-site-generator/core run build`）。
