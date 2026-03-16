# GitHub リポジトリ自動作成・プッシュ仕様

生成された Next.js プロジェクトを **Git で初期化し、GitHub に新規リポジトリを作成してプッシュ**する手順と責務を定義する。実装は `packages/deploy` が担当する。本プロジェクト自体も、この仕様に沿って「自動で全部」できることを目指す。

## 目的

- 生成済みディレクトリを **Git リポジトリとして初期化**し、**GitHub に新規リポジトリを作成**して **push** までを自動実行する。
- デプロイ（Vercel）が Git 連携の場合は、このリポジトリを Vercel が参照する。

## 位置づけ（オプション）

- 本仕様（GitHub リポジトリ自動作成・push）は、**生成物の保存・共有・後編集をしやすくするためのオプション**である。
- 初版の運用では、[Vercel デプロイ仕様](./03-vercel-deploy.md) のとおり **GitHub に push せず、ディレクトリから Vercel に直接デプロイ**して URL を返してもよい。
- GitHub に push する場合のみ `GITHUB_TOKEN` が必須となる。

## 入力・出力

- **入力**
  - 生成済み Next.js プロジェクトのディレクトリパス。
  - リポジトリ名（省略時はプロジェクト名や一意 ID から生成）。
  - オーナー（GitHub ユーザーまたは org）。省略時はトークンに紐づくユーザー。
- **出力**
  - 成功時: `{ repoUrl: string; cloneUrl: string; defaultBranch: string }`
  - 失敗時: `{ error: string; details?: unknown }`

## 手順（自動で行うこと）

1. **ローカル Git 初期化**  
   `git init` → `git add -A` → `git commit -m "..."` を生成ディレクトリで実行する。

2. **GitHub にリポジトリ作成**  
   - **GitHub REST API** `POST /user/repos`（または `POST /orgs/:org/repos`）で新規リポジトリを作成する。  
   - 認証は **環境変数 `GITHUB_TOKEN`**（Personal Access Token）を用いる。  
   - リポジトリ名は入力または一意名。**生成するサイト用リポジトリはプライベート**とする（`private: true` で作成）。本プロジェクト（サイトジェネレーター）のリポジトリはパブリック、生成物のリポジトリはプライベート、という方針。

3. **リモート追加とプッシュ**  
   `git remote add origin <cloneUrl>` → `git push -u origin main`（または既定ブランチ）を実行する。  
   - 認証は `GITHUB_TOKEN` を利用（HTTPS の場合は URL にトークンを含めるか、credential helper で渡す）。

## 認証・トークンの扱い

- **GITHUB_TOKEN**（必須）: GitHub Personal Access Token。`repo` スコープを持つこと。  
- サーバー／CLI では **環境変数** から読み込む。リポジトリに含めず、`.env` でローカル設定、本番では実行環境の環境変数で設定する。  
- 将来、ユーザーが Web UI から自分のトークンを登録する方式に拡張する場合は、別仕様で定義する。

## エラーハンドリング

- リポジトリ名の重複・ネットワークエラー・認証エラーは呼び出し元に返し、ユーザーに表示できる形にする。
- 必要に応じてリトライ（レート制限を考慮）を検討する。

## 関連

- [生成パイプライン仕様](./02-generation-pipeline.md)
- [Vercel デプロイ仕様](./03-vercel-deploy.md)
- [システムアーキテクチャ](../architecture/02-system-architecture.md)
