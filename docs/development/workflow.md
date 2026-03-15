# ドキュメント駆動開発 — 開発フロー・原則（正本）

**設計・仕様の正は `docs/` にあり、コードはドキュメントに従う。** 開発・変更時は本ドキュメントのフローを守ること。AI（Cursor 等）も人も、ここをコンテキストの入口とする。

---

## 原則

| 原則 | 内容 |
|------|------|
| **正は docs/** | 要件は [requirements/](../requirements/)、アーキテクチャは [architecture/](../architecture/)、詳細仕様は [specs/](../specs/)。コードはこれらに合わせて実装する。 |
| **変更は doc ファースト** | 挙動・仕様を変えるときは **必ず先に該当する docs を参照し、仕様を更新してから**コードを変更する。「実装してからドキュメントを合わせる」は本流ではない。 |
| **仕様がずれたときだけ docs を後追い** | すでにコードだけ変わっている場合（他者や手違いで）は、仕様とずれないよう該当 spec を後から更新する。普段の流れは「仕様を書く → 実装する」。 |
| **ディレクトリ・パッケージの変更** | 追加・役割変更時は必ず [architecture/01-directory-structure.md](../architecture/01-directory-structure.md) を先に更新してから実装する。 |
| **分割してテストしながら実装** | 実装は一気に行わず、仕様の範囲を切って「実装 → 確認・テスト」を繰り返す。開発者の確認・レビュー・理解が追い付くようにする。詳細は [lessons-learned.md](./lessons-learned.md) を参照。 |

---

## 開発フロー（手順）

**挙動・機能を変えるときの正しい順序:** ① ドキュメントを参照する → ② ドキュメント（仕様）を更新する → ③ 更新した仕様に合わせて実装する。

1. **新規機能・仕様変更**
   - **① 参照** … 該当する `docs/`（requirements / architecture / specs）を開く。
   - **② 仕様を更新** … 何をどう変えるかを docs に書く（要件・スキーマ・UI 仕様など）。
   - **③ 実装** … 更新した docs を唯一の正としてコードを書く・変更する。
2. **バグ修正・リファクタ（仕様変更なし）**
   - コードを直す。仕様の文言に影響する場合は該当 spec を更新してから実装する。
3. **ディレクトリ・パッケージの追加・役割変更**
   - 必ず [architecture/01-directory-structure.md](../architecture/01-directory-structure.md) を先に更新してから実装する。

---

## 参照順（実装・レビュー時）

1. [requirements/00-overview.md](../requirements/00-overview.md) — 目標・スコープ
2. [architecture/01-directory-structure.md](../architecture/01-directory-structure.md) — ディレクトリ・責務
3. [architecture/02-system-architecture.md](../architecture/02-system-architecture.md) — データフロー・コンポーネント
4. 該当機能の [specs/](../specs/)（例: 01 入力スキーマ、04 マークダウン仕様、09 UI 仕様）

---

## 関連

- [docs/README.md](../README.md) — ドキュメント構成・索引
- [00-development-flow-record.md](../00-development-flow-record.md) — 設計〜実装の経緯
- [lessons-learned.md](./lessons-learned.md) — 学び・振り返り（分割実装・テストの推奨など）・チェックリスト
