import * as fs from "node:fs/promises";
import * as path from "node:path";

export type DeployResult =
  | { success: true; url: string }
  | { success: false; error: string; code?: string };

const VERCEL_API = "https://api.vercel.com";
const POLL_INTERVAL_MS = 3000;
const DEPLOY_TIMEOUT_MS = 5 * 60 * 1000; // 5 min

const EXCLUDE_DIRS = new Set(["node_modules", ".git", ".next", "dist"]);

/** バイナリかどうか（base64 で送る必要がある） */
function isBinaryFile(relativePath: string): boolean {
  const ext = path.extname(relativePath).toLowerCase();
  return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg"].includes(ext);
}

/**
 * ディレクトリ内のファイルを再帰的に収集し、Vercel API 用の files 配列を返す。
 */
async function collectFiles(
  dir: string,
  baseDir: string = dir
): Promise<{ file: string; data: string; encoding: "utf-8" | "base64" }[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const result: { file: string; data: string; encoding: "utf-8" | "base64" }[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      const sub = await collectFiles(fullPath, baseDir);
      result.push(...sub);
    } else {
      const content = await fs.readFile(fullPath);
      const isBinary = isBinaryFile(relativePath);
      result.push({
        file: relativePath,
        data: isBinary ? content.toString("base64") : content.toString("utf-8"),
        encoding: isBinary ? "base64" : "utf-8",
      });
    }
  }
  return result;
}

/**
 * 生成済みディレクトリを Vercel REST API でデプロイし、URL を返す。
 * 03 仕様: デプロイはロジック（REST API）で行う。ローカルでの npm install / build / CLI は使わない。
 */
export async function deployFromDir(dir: string): Promise<DeployResult> {
  const resolvedDir = path.resolve(dir);
  try {
    await fs.access(path.join(resolvedDir, "package.json"));
  } catch {
    return { success: false, error: "package.json がありません", code: "INVALID_PROJECT" };
  }

  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    return { success: false, error: "VERCEL_TOKEN が設定されていません", code: "CONFIG_ERROR" };
  }

  const targetRaw = (process.env.VERCEL_DEPLOY_TARGET ?? "preview").toLowerCase();
  const target = targetRaw === "prod" || targetRaw === "production" ? "production" : "preview";

  let files: { file: string; data: string; encoding: "utf-8" | "base64" }[];
  try {
    files = await collectFiles(resolvedDir);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `ファイル収集失敗: ${msg}`, code: "DEPLOY_ERROR" };
  }

  if (files.length === 0) {
    return { success: false, error: "デプロイするファイルがありません", code: "INVALID_PROJECT" };
  }

  const projectName = `gen-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const teamId = process.env.VERCEL_ORG_ID || undefined;

  const createUrl = new URL(`${VERCEL_API}/v13/deployments`);
  if (teamId) createUrl.searchParams.set("teamId", teamId);
  createUrl.searchParams.set("skipAutoDetectionConfirmation", "1");

  const createBody = {
    name: projectName,
    files,
    target,
    projectSettings: {
      framework: "nextjs",
      buildCommand: "npm run build",
      installCommand: "npm install",
    },
  };

  let deploymentId: string;
  try {
    const res = await fetch(createUrl.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      let errMsg = `Vercel API エラー (${res.status})`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error?.message) errMsg = errJson.error.message;
      } catch {
        if (errText.length < 200) errMsg = errText;
      }
      return { success: false, error: errMsg, code: "DEPLOY_ERROR" };
    }

    const data = (await res.json()) as { id?: string; url?: string };
    const id = data.id;
    if (!id) {
      return { success: false, error: "デプロイ ID が取得できませんでした", code: "DEPLOY_ERROR" };
    }
    deploymentId = id;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `デプロイ作成失敗: ${msg}`, code: "DEPLOY_ERROR" };
  }

  // ポーリングで完了待機
  const getUrl = new URL(`${VERCEL_API}/v13/deployments/${deploymentId}`);
  if (teamId) getUrl.searchParams.set("teamId", teamId);

  const startedAt = Date.now();
  while (Date.now() - startedAt < DEPLOY_TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    try {
      const res = await fetch(getUrl.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errText = await res.text();
        return {
          success: false,
          error: `デプロイ状態取得失敗: ${errText.slice(0, 200)}`,
          code: "DEPLOY_ERROR",
        };
      }

      const dep = (await res.json()) as {
        readyState?: string;
        url?: string;
        buildingAt?: number;
        error?: { message?: string };
      };

      if (dep.readyState === "READY" && dep.url) {
        return { success: true, url: dep.url };
      }
      if (dep.readyState === "ERROR") {
        const errMsg = dep.error?.message ?? "Vercel ビルドが失敗しました";
        return { success: false, error: errMsg, code: "BUILD_ERROR" };
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { success: false, error: `ポーリング失敗: ${msg}`, code: "DEPLOY_ERROR" };
    }
  }

  return {
    success: false,
    error: "デプロイの完了待機がタイムアウトしました",
    code: "DEPLOY_ERROR",
  };
}
