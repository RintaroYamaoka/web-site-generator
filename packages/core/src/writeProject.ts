import * as fs from "node:fs/promises";
import * as path from "node:path";
import { tmpdir } from "node:os";

const FILE_BLOCK_REG = /---FILE:\s*([^\n---]+)---\n([\s\S]*?)---END---/g;

/**
 * LLM 出力テキストをパースし、一時ディレクトリにファイルを書き出す。
 * 戻り値: 生成ディレクトリのパス、または Error
 */
export async function writeProjectFromLlmOutput(llmText: string): Promise<string | Error> {
  const dir = path.join(tmpdir(), `web-site-generator-${Date.now()}`);
  await fs.mkdir(dir, { recursive: true });

  let match: RegExpExecArray | null;
  FILE_BLOCK_REG.lastIndex = 0;
  const seen = new Set<string>();
  while ((match = FILE_BLOCK_REG.exec(llmText)) !== null) {
    const [, filePath, content] = match;
    const normalized = path.normalize(filePath.trim()).replace(/^(\.\/)+/, "");
    if (normalized.includes("..") || path.isAbsolute(normalized)) continue;
    const fullPath = path.join(dir, normalized);
    const parent = path.dirname(fullPath);
    await fs.mkdir(parent, { recursive: true });
    await fs.writeFile(fullPath, content.trimEnd() + "\n", "utf-8");
    seen.add(normalized);
  }

  if (seen.size === 0) return new Error("LLM が有効なファイルを出力しませんでした");

  return dir;
}
