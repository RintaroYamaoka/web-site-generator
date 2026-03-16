import * as fs from "node:fs/promises";
import { execSync } from "node:child_process";
import * as path from "node:path";

export type DeployResult =
  | { success: true; url: string }
  | { success: false; error: string; code?: string };

/**
 * 生成済み Next.js ディレクトリで npm install → build → git init → vercel（preview/prod）を実行し、URL を返す。
 * 03 仕様: 初版は Vercel CLI でディレクトリから直接デプロイ。
 */
export async function deployFromDir(dir: string): Promise<DeployResult> {
  const cwd = path.resolve(dir);
  try {
    await fs.access(path.join(cwd, "package.json"));
  } catch {
    return { success: false, error: "package.json がありません", code: "INVALID_PROJECT" };
  }

  try {
    execSync("npm install", { cwd, stdio: "pipe", encoding: "utf-8" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `npm install 失敗: ${msg}`, code: "BUILD_ERROR" };
  }

  try {
    execSync("npm run build", { cwd, stdio: "pipe", encoding: "utf-8" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `ビルド失敗: ${msg}`, code: "BUILD_ERROR" };
  }

  try {
    execSync("git init", { cwd, stdio: "pipe" });
    execSync("git add -A", { cwd, stdio: "pipe" });
    execSync("git commit -m \"Initial commit\"", { cwd, stdio: "pipe" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `Git 初期化失敗: ${msg}`, code: "GIT_ERROR" };
  }

  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    return { success: false, error: "VERCEL_TOKEN が設定されていません", code: "CONFIG_ERROR" };
  }

  const targetRaw = (process.env.VERCEL_DEPLOY_TARGET ?? "preview").toLowerCase();
  const isProd = targetRaw === "prod" || targetRaw === "production";
  const vercelCmd = isProd
    ? `npx vercel --yes --token ${token} --prod`
    : `npx vercel --yes --token ${token}`;

  try {
    const result = execSync(
      vercelCmd,
      { cwd, encoding: "utf-8", env: { ...process.env, VERCEL_TOKEN: token } }
    );
    const urlMatch = result.match(/https:\/\/[^\s]+/);
    const url = urlMatch ? urlMatch[0].trim() : "";
    if (!url) return { success: false, error: "Vercel が URL を返しませんでした", code: "DEPLOY_ERROR" };
    return { success: true, url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `Vercel デプロイ失敗: ${msg}`, code: "DEPLOY_ERROR" };
  }
}
