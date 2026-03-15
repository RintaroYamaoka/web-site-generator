import { NextResponse } from "next/server";
import { runFullPipeline } from "@web-site-generator/core";
import type { SiteGenerationInput } from "@web-site-generator/shared";

export const maxDuration = 300; // 5 min (Vercel Pro: 300). Free tier may be 60.

export async function POST(request: Request) {
  let input: SiteGenerationInput;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const inputStr = formData.get("input");
    if (typeof inputStr !== "string") {
      return NextResponse.json(
        { error: "フォームに input が含まれていません", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    try {
      input = JSON.parse(inputStr) as SiteGenerationInput;
    } catch {
      return NextResponse.json(
        { error: "input の JSON が不正です", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
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
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: 422 }
    );
  } else {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "不正な JSON です", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    input = body as SiteGenerationInput;
  }

  const result = await runFullPipeline(input);

  if (result.success) {
    return NextResponse.json({ url: result.url, specMarkdown: result.specMarkdown });
  }
  return NextResponse.json(
    { error: result.error, code: result.code },
    { status: 422 }
  );
}
