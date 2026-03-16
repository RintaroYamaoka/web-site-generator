import * as fs from "node:fs/promises";
import * as path from "node:path";
import { GoogleGenAI } from "@google/genai";
import type { SiteGenerationInput } from "@web-site-generator/shared";
import { validateSiteGenerationInput } from "@web-site-generator/shared";
import { buildMarkdown } from "./buildMarkdown.js";
import { writeProjectFromLlmOutput } from "./writeProject.js";
import { deployFromDir } from "@web-site-generator/deploy";
import { createLogger, generateRequestId } from "./logger.js";

const MODEL_ID = "gemini-3-flash-preview";

/** 添付画像: ref（例: section_0_0）→ バイナリと Content-Type */
export type AttachedImages = Record<string, { data: Buffer; contentType: string }>;

function contentTypeToExt(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "png";
}

async function writeAttachedImages(
  outDir: string,
  attachedImages: AttachedImages
): Promise<void> {
  const imagesDir = path.join(outDir, "public", "images");
  await fs.mkdir(imagesDir, { recursive: true });
  for (const [ref, { data, contentType }] of Object.entries(attachedImages)) {
    const ext = contentTypeToExt(contentType);
    const filePath = path.join(imagesDir, `${ref}.${ext}`);
    await fs.writeFile(filePath, data);
  }
}

const TECH_SPEC_SUMMARY = `
生成するサイトは次の技術・構成に**固定**すること。**必ず npm run build が成功するコードを出力すること。**

【技術スタック】
- Next.js 14 (App Router), TypeScript, Tailwind CSS, npm
- package.json の dependencies は必ず "next": "14.2.0", "react": "18.2.0", "react-dom": "18.2.0" を含める
- 画像は必ず next/image を使用する
- 追加の依存パッケージは極力増やさない（必要な場合のみ、正しいバージョンで追加）

【必須のファイル構成】
- package.json（scripts.build: "next build", scripts.dev: "next dev" を含む）
- tsconfig.json（"strict": true, "module": "ESNext" 等）
- next.config.mjs または next.config.js
- tailwind.config.ts（content: ["./app/**/*.tsx", ...]）
- postcss.config.mjs（plugins: tailwindcss, autoprefixer）
- app/layout.tsx（export default function RootLayout）
- app/page.tsx（トップ）
- 仕様書の各ページに対応する app/<path>/page.tsx

【ビルドエラーを防ぐ制約】
- "use client" は useState/onClick 等のクライアント機能を使うコンポーネントにのみ付ける。layout.tsx や静的な page には付けない。
- import は必ず正しいパスで書く。@/ は使わず相対パス（../）で統一するか、tsconfig の paths を正しく設定する。
- React コンポーネントは default export で export default function Xxx とする。
- next/image は import Image from "next/image" でインポートし、width/height または fill を指定する。
- 上記の必須ファイルは**すべて必ず作成**し、構文エラー・型エラーがないこと。
- 仕様書の見出し・本文・文言・画像指定をすべて反映すること。デザインは中身とデザイン希望に合わせる。
`.trim();

const OUTPUT_FORMAT = `
出力形式: 各ファイルを次のブロックで出力すること。パスはプロジェクトルートからの相対パス。
---FILE: パス---
ファイルの内容（そのまま）
---END---
例:
---FILE: package.json---
{ "name": "my-site", "private": true, "scripts": { "build": "next build" }, "dependencies": { "next": "14.2.0", "react": "18.2.0", "react-dom": "18.2.0" } }
---END---
---FILE: app/layout.tsx---
export default function RootLayout({ children }: { children: React.ReactNode }) { /* ... */ }
---END---

必須のファイル（package.json, tsconfig.json, next.config.(mjs|js), tailwind.config.(js|ts), postcss.config.(js|cjs), app/layout.tsx, 各ページの app/<path>/page.tsx）は必ず出力し、それ以外のファイルも必要に応じてこの形式で出力すること。
`.trim();

export type PipelineResult =
  | { success: true; url: string; specMarkdown: string }
  | { success: false; error: string; code?: string };

/**
 * 単一エントリポイント: 検証 → 1本MD → LLM実装 → 添付画像配置 → デプロイ（REST API）。成功時のみ URL を返す。
 * 本番運用: 構造化ログ・例外処理・エラーコードを網羅。
 */
export async function runFullPipeline(
  input: SiteGenerationInput,
  options?: { apiKey?: string; timeoutMs?: number; attachedImages?: AttachedImages }
): Promise<PipelineResult> {
  const requestId = generateRequestId();
  const log = createLogger(requestId);
  const stepStart = () => Date.now();
  const stepEnd = (start: number) => Date.now() - start;

  // 1. 設定チェック
  const apiKey = options?.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    log.error("CONFIG_CHECK", { code: "CONFIG_ERROR", message: "GEMINI_API_KEY 未設定" });
    return { success: false, error: "GEMINI_API_KEY が設定されていません", code: "CONFIG_ERROR" };
  }

  // 2. 入力検証
  const t0 = stepStart();
  const validationError = validateSiteGenerationInput(input);
  if (validationError) {
    log.error("VALIDATION", { code: "VALIDATION_ERROR", error: validationError, durationMs: stepEnd(t0) });
    return { success: false, error: validationError, code: "VALIDATION_ERROR" };
  }
  log.info("VALIDATION", { durationMs: stepEnd(t0) });

  // 3. 仕様MD生成（ロジック）
  const t1 = stepStart();
  const specMarkdown = buildMarkdown(input);
  log.info("BUILD_SPEC", { durationMs: stepEnd(t1) });

  const attachedImages = options?.attachedImages ?? {};
  const attachedRefs = Object.keys(attachedImages);
  const attachedFileList =
    attachedRefs.length > 0
      ? attachedRefs
          .map((ref) => `${ref}.${contentTypeToExt(attachedImages[ref].contentType)}`)
          .join(", ")
      : "";
  const attachedInstruction =
    attachedRefs.length > 0
      ? `\n\n【添付画像について】ユーザーが添付した画像を、生成したプロジェクトの public/images/ に次のファイル名で配置します: ${attachedFileList}。該当セクションでは next/image の src="/images/<上記のファイル名>" で参照すること。\n`
      : "";

  // 4. LLM 実装
  const t2 = stepStart();
  const prompt = `${TECH_SPEC_SUMMARY}\n\n${OUTPUT_FORMAT}${attachedInstruction}\n\n以下が仕様書（1本マークダウン）です。この仕様に従い、Next.js プロジェクトの全ファイルを上記形式で出力してください。\n\n--- 仕様書 ---\n${specMarkdown}`;

  let llmText: string;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
    });
    llmText = response.text ?? "";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error("LLM_GENERATE", { code: "LLM_ERROR", error: msg, durationMs: stepEnd(t2) });
    return { success: false, error: `LLM 呼び出しエラー: ${msg}`, code: "LLM_ERROR" };
  }
  log.info("LLM_GENERATE", { durationMs: stepEnd(t2) });

  // 5. ファイル書き出し
  const t3 = stepStart();
  const outDir = await writeProjectFromLlmOutput(llmText);
  if (outDir instanceof Error) {
    log.error("WRITE_PROJECT", { code: "LLM_OUTPUT_ERROR", error: outDir.message, durationMs: stepEnd(t3) });
    return { success: false, error: outDir.message, code: "LLM_OUTPUT_ERROR" };
  }
  log.info("WRITE_PROJECT", { durationMs: stepEnd(t3) });

  // 6. 添付画像配置
  if (attachedRefs.length > 0) {
    const t4 = stepStart();
    try {
      await writeAttachedImages(outDir, attachedImages);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log.error("WRITE_IMAGES", { code: "ATTACHED_IMAGES_ERROR", error: msg, durationMs: stepEnd(t4) });
      return { success: false, error: `添付画像の書き出し失敗: ${msg}`, code: "ATTACHED_IMAGES_ERROR" };
    }
    log.info("WRITE_IMAGES", { durationMs: stepEnd(t4) });
  }

  // 7. デプロイ（REST API・ロジック）
  const t5 = stepStart();
  const deployResult = await deployFromDir(outDir);
  if (!deployResult.success) {
    log.error("DEPLOY", {
      code: deployResult.code ?? "DEPLOY_ERROR",
      error: deployResult.error,
      durationMs: stepEnd(t5),
    });
    return { success: false, error: deployResult.error, code: deployResult.code ?? "DEPLOY_ERROR" };
  }
  log.info("DEPLOY", { message: "success", durationMs: stepEnd(t5) });

  return {
    success: true,
    url: deployResult.url,
    specMarkdown,
  };
}
