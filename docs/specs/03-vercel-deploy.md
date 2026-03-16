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

## 実装方針（候補）

1. **Vercel REST API**  
   [Deployments API](https://vercel.com/docs/rest-api#endpoints/deployments) を用い、ZIP をアップロードしてデプロイ。プロジェクトが未作成の場合は Projects API で先に作成する。

2. **Vercel CLI**  
   `vercel --prod` を子プロセスで実行し、標準出力から URL をパースする。CLI がインストールされている環境に依存する。

**初版の運用**: 生成ディレクトリに対して **Vercel CLI**（`vercel --prod` 相当）でデプロイする。GitHub リポジトリ（05）の作成・push はオプションとし、Vercel は **CLI 経由でディレクトリから直接デプロイ**する形でよい。のちに Git 連携に切り替える場合は `docs/decisions/` で ADR 化する。

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
- `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`: 既存プロジェクトにデプロイする場合に指定。未指定の場合は新規プロジェクトとして作成する方針とする。
- これらはリポジトリに含めず、ルートの `.env.example` に変数名だけ記載する。実行時は環境変数から読み込む（ユーザー設定でトークンを登録する拡張は別仕様）。

## エラーハンドリング

- ネットワークエラー・認証エラー・ビルド失敗は、呼び出し元がメッセージをユーザーに表示できる形で返す。
- リトライは Vercel のレート制限を考慮し、必要なら指数バックオフを検討する（詳細は実装時または ADR で定義）。

## 関連

- [生成パイプライン仕様](./02-generation-pipeline.md)
- [GitHub リポジトリ自動作成・プッシュ](./05-github-repo.md)
- [システムアーキテクチャ](../architecture/02-system-architecture.md)

## モノレポ（workspace）での注意

- `apps/web` は `@web-site-generator/*` を workspace 依存しているため、デプロイ環境で `apps/web` だけを `next build` すると、依存パッケージの `dist/` が存在せず **Module not found** になる場合がある。
- 対策: `apps/web` のビルド前に `packages/*` の `build`（`tsc`）を実行する（例: `pnpm -r --filter @web-site-generator/shared --filter @web-site-generator/deploy --filter @web-site-generator/core run build`）。
