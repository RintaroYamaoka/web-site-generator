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

推奨: 初期は **Vercel CLI** で実装し、のちに API に切り替えるかは `docs/decisions/` で ADR 化する。

## 環境変数・認証

- `VERCEL_TOKEN`: デプロイに使う Vercel のトークン（必須）。
- `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`: 既存プロジェクトにデプロイする場合に指定。未指定の場合は新規プロジェクトとして作成する方針とする。
- これらはリポジトリに含めず、`.env.example` に変数名だけ記載する。

## エラーハンドリング

- ネットワークエラー・認証エラー・ビルド失敗は、呼び出し元がメッセージをユーザーに表示できる形で返す。
- リトライは Vercel のレート制限を考慮し、必要なら指数バックオフを検討する（詳細は実装時または ADR で定義）。

## 関連

- [生成パイプライン仕様](./02-generation-pipeline.md)
- [システムアーキテクチャ](../architecture/02-system-architecture.md)
