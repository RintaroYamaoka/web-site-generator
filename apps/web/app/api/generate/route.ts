import { NextResponse } from "next/server";
import { runFullPipeline } from "@web-site-generator/core";
import type { SiteGenerationInput } from "@web-site-generator/shared";

export const maxDuration = 300; // 5 min (Vercel Pro: 300). Free tier may be 60.

function errResponse(error: string, code: string, status: number) {
  return NextResponse.json({ error, code }, { status });
}

export async function POST(request: Request) {
  let input: SiteGenerationInput;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const inputStr = formData.get("input");
      if (typeof inputStr !== "string") {
        return errResponse("フォームに input が含まれていません", "VALIDATION_ERROR", 400);
      }
      try {
        input = JSON.parse(inputStr) as SiteGenerationInput;
      } catch {
        return errResponse("input の JSON が不正です", "VALIDATION_ERROR", 400);
      }
      const attachedImages: Record<string, { data: Buffer; contentType: string }> = {};
      const sectionRefPattern = /^section_\d+_\d+$/;
      for (const [key, value] of formData.entries()) {
        if (!sectionRefPattern.test(key) || !(value instanceof File)) continue;
        const ab = await value.arrayBuffer();
        attachedImages[key] = {
          data: Buffer.from(ab),
          contentType: value.type || "image/png",
        };
      }
      const result = await runFullPipeline(input, {
        attachedImages: Object.keys(attachedImages).length > 0 ? attachedImages : undefined,
      });
      if (result.success) {
        return NextResponse.json({ url: result.url, specMarkdown: result.specMarkdown });
      }
      return errResponse(result.error, result.code ?? "UNKNOWN_ERROR", 422);
    }

    const body = await request.json();
    input = body as SiteGenerationInput;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/generate] リクエスト解析エラー:", msg);
    return errResponse("不正なリクエストです", "VALIDATION_ERROR", 400);
  }

  try {
    const result = await runFullPipeline(input);
    if (result.success) {
      return NextResponse.json({ url: result.url, specMarkdown: result.specMarkdown });
    }
    return errResponse(result.error, result.code ?? "UNKNOWN_ERROR", 422);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/generate] パイプライン予期せぬエラー:", msg);
    return errResponse("サイト生成中にエラーが発生しました。しばらく経ってから再試行してください。", "INTERNAL_ERROR", 500);
  }
}
