# ドキュメント — 設計の正（docs/）

本プロジェクトは **ドキュメント駆動開発** を行う。**開発フロー・原則の正本は [development/workflow.md](./development/workflow.md) にあり、** コードを書く・変える前に必ずそちらを確認すること。コンテキストの入口は docs/ に集約する。

---

## 方針（要約）

- **設計の正は `docs/`** … 要件・アーキテクチャ・詳細仕様はここにあり、コードはこれに従う。
- **変更は doc ファースト** … 挙動・仕様を変えるときは **① 該当 docs を参照 → ② 仕様を更新 → ③ 実装**の順で行う。先に実装してからドキュメントを合わせるのは本流ではない。
- **仕様がずれたとき** … すでにコードだけ変わっている場合は、該当 spec を後から更新して整合を取る。

詳細は [development/workflow.md](./development/workflow.md)。

---

## ドキュメント構成

| ディレクトリ | 役割 | 更新タイミング |
|-------------|------|----------------|
| [requirements/](./requirements/) | 目標・ユーザーストーリー・受け入れ条件 | 要件・スコープ変更時 |
| [architecture/](./architecture/) | システム構成・ディレクトリ設計・データフロー | 設計・リファクタ・ディレクトリ追加時 |
| [specs/](./specs/) | API・UI・入力スキーマ・生成パイプライン・MD 形式・デプロイ等の詳細仕様 | 仕様を変えるときはここを先に更新し、その後実装する |
| [decisions/](./decisions/) | アーキテクチャ決定記録（ADR） | 重要な技術判断時 |
| [templates/](./templates/) | サイトテンプレート・コンテンツの設計メモ | テンプレ追加・変更時 |
| [development/](./development/) | 開発フロー・原則（正本）・学び | 運用ルール変更時・振り返り時 |

---

## 参照順（実装・仕様確認時）

[development/workflow.md](./development/workflow.md) の「参照順」に従う。短くまとめると:

1. [プロジェクト概要・目標](./requirements/00-overview.md)
2. [ディレクトリ構造](./architecture/01-directory-structure.md)
3. [システムアーキテクチャ](./architecture/02-system-architecture.md)
4. 該当機能の **specs/** 内ドキュメント  
   - 例: [01 入力スキーマ](./specs/01-input-schema.md) / [02 生成パイプライン](./specs/02-generation-pipeline.md) / [04 マークダウン仕様](./specs/04-markdown-spec-format.md) / [07 生成サイト技術仕様](./specs/07-generated-site-tech-spec.md) / [08 LLM 選定](./specs/08-llm-selection.md) / [09 ジェネレーター UI](./specs/09-generator-ui-spec.md) / [10 エラーハンドリング](./specs/10-error-handling.md)

---

## 開発フロー記録・リスク・学び

- **設計〜実装に至った経緯** … [00-development-flow-record.md](./00-development-flow-record.md) に記録。実装開始時の参照順・チェックリストもあり。
- **実装前リスク・対応** … [implementation-risks.md](./implementation-risks.md) に調査結果をまとめてある。
- **学び・振り返り** … [development/lessons-learned.md](./development/lessons-learned.md) に、分割してテストしながら実装する推奨などを記録・共有する。
