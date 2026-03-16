# エラーハンドリング・ログ仕様

本番運用向けの例外処理・エラーコード・構造化ログを定義する。

## エラーコード一覧

| code | 意味 | ユーザー向けメッセージ例 |
|------|------|---------------------------|
| `CONFIG_ERROR` | 環境変数未設定（GEMINI_API_KEY, VERCEL_TOKEN） | 設定エラー。管理者に連絡してください。 |
| `VALIDATION_ERROR` | 入力不正・JSON 不正 | 入力内容を確認してください。 |
| `LLM_ERROR` | Gemini API 呼び出し失敗 | 生成処理でエラーが発生しました。しばらく経ってから再試行してください。 |
| `LLM_OUTPUT_ERROR` | LLM 出力のパース失敗（有効なファイルが得られない） | 生成結果の解析に失敗しました。再試行してください。 |
| `ATTACHED_IMAGES_ERROR` | 添付画像の書き出し失敗 | 画像の処理中にエラーが発生しました。 |
| `BUILD_ERROR` | Vercel 側ビルド失敗 | サイトのビルドに失敗しました。入力内容を調整して再試行してください。 |
| `DEPLOY_ERROR` | デプロイ API 失敗・タイムアウト・ネットワークエラー | デプロイ処理でエラーが発生しました。しばらく経ってから再試行してください。 |
| `INVALID_PROJECT` | package.json なし・ファイルなし | 生成されたプロジェクトが不正です。 |
| `INTERNAL_ERROR` | 予期せぬ例外（API ルートの catch） | サイト生成中にエラーが発生しました。しばらく経ってから再試行してください。 |
| `NETWORK_ERROR` | フロント側の fetch 失敗（ネットワーク・タイムアウト） | 通信エラーが発生しました。ネットワークを確認して再試行してください。 |

## 構造化ログ

`packages/core` の `runFullPipeline` は、各ステップで `createLogger(requestId)` によりログを出力する。

- **フォーマット**: JSON 1 行。`requestId`, `step`, `level`, `timestamp`, `durationMs`, `code`, `error` 等を含む。
- **ステップ名**: `CONFIG_CHECK`, `VALIDATION`, `BUILD_SPEC`, `LLM_GENERATE`, `WRITE_PROJECT`, `WRITE_IMAGES`, `DEPLOY`
- **レベル**: `info`（成功）, `warn`（軽微）, `error`（失敗）

Vercel の Functions ログで `requestId` を検索すれば、1 リクエスト分の流れを追える。

## 例外処理の原則

- パイプライン内のすべての非同期処理は `try/catch` で囲み、失敗時は必ず `{ success: false, error, code }` を返す。
- `/api/generate` は最外層で `try/catch` し、予期せぬ例外時は 500 と `INTERNAL_ERROR` を返す。
- フロントは `fetch` の `catch` でネットワークエラーを `NETWORK_ERROR` としてエラーページに渡す。

## 関連

- [生成パイプライン](./02-generation-pipeline.md)
- [Vercel デプロイ仕様](./03-vercel-deploy.md)
- [ジェネレーター UI（エラーページ）](./09-generator-ui-spec.md)
