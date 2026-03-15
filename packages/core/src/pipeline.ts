import * as fs from "node:fs/promises";
import * as path from "node:path";
import { GoogleGenAI } from "@google/genai";
import type { SiteGenerationInput } from "@web-site-generator/shared";
import { validateSiteGenerationInput } from "@web-site-generator/shared";
import { buildMarkdown } from "./buildMarkdown.js";
import { writeProjectFromLlmOutput } from "./writeProject.js";
import { deployFromDir } from "@web-site-generator/deploy";

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
生成するサイトは次の技術に固定すること:
- Next.js (App Router), TypeScript, Tailwind CSS, npm
- app/ 配下に layout.tsx, page.tsx。ルートは仕様書のパスに合わせる
- 画像は next/image を使用
- デザイン希望は Tailwind のクラスとコンポーネントで反映
- 仕様書の見出し・本文・文言・画像指定をすべて反映すること。デザインは中身とデザイン希望に合わせる。
`.trim();

const OUTPUT_FORMAT = `
出力形式: 各ファイルを次のブロックで出力すること。パスはプロジェクトルートからの相対パス。
---FILE: パス---
ファイルの内容（そのまま）
---END---
例:
---FILE: package.json---
{ "name": "..." }
---END---
---FILE: app/layout.tsx---
export default function Layout...
---END---
`.trim();

export type PipelineResult =
  | { success: true; url: string; specMarkdown: string }
  | { success: false; error: string; code?: string };

/**
 * 単一エントリポイント: 検証 → 1本MD → LLM実装 → 添付画像配置 → ビルド確認 → デプロイ。成功時のみ URL を返す。
 */
export async function runFullPipeline(
  input: SiteGenerationInput,
  options?: { apiKey?: string; timeoutMs?: number; attachedImages?: AttachedImages }
): Promise<PipelineResult> {
  const apiKey = options?.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { success: false, error: "GEMINI_API_KEY が設定されていません", code: "CONFIG_ERROR" };
  }

  const validationError = validateSiteGenerationInput(input);
  if (validationError) {
    return { success: false, error: validationError, code: "VALIDATION_ERROR" };
  }

  const specMarkdown = buildMarkdown(input);
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

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `${TECH_SPEC_SUMMARY}\n\n${OUTPUT_FORMAT}${attachedInstruction}\n\n以下が仕様書（1本マークダウン）です。この仕様に従い、Next.js プロジェクトの全ファイルを上記形式で出力してください。\n\n--- 仕様書 ---\n${specMarkdown}`;

  let llmText: string;
  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
    });
    llmText = response.text ?? "";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `LLM 呼び出しエラー: ${msg}`, code: "LLM_ERROR" };
  }

  const outDir = await writeProjectFromLlmOutput(llmText);
  if (outDir instanceof Error) {
    return { success: false, error: outDir.message, code: "LLM_OUTPUT_ERROR" };
  }

  if (attachedRefs.length > 0) {
    try {
      await writeAttachedImages(outDir, attachedImages);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { success: false, error: `添付画像の書き出し失敗: ${msg}`, code: "ATTACHED_IMAGES_ERROR" };
    }
  }

  const deployResult = await deployFromDir(outDir);
  if (!deployResult.success) {
    return { success: false, error: deployResult.error, code: deployResult.code ?? "DEPLOY_ERROR" };
  }

  return {
    success: true,
    url: deployResult.url,
    specMarkdown,
  };
}
