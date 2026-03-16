/**
 * 構造化ログ（本番運用向け）。
 * Vercel のログで requestId とステップを追えるようにする。
 */
export type LogLevel = "info" | "warn" | "error";

export type LogPayload = {
  requestId: string;
  step: string;
  level: LogLevel;
  message?: string;
  durationMs?: number;
  code?: string;
  error?: string;
};

function formatLog(payload: LogPayload): string {
  return JSON.stringify({
    ...payload,
    timestamp: new Date().toISOString(),
  });
}

export function createLogger(requestId: string) {
  return {
    info(step: string, extra?: { message?: string; durationMs?: number }) {
      console.log(
        formatLog({
          requestId,
          step,
          level: "info",
          ...extra,
        })
      );
    },
    warn(step: string, extra?: { message?: string; code?: string; error?: string; durationMs?: number }) {
      console.warn(
        formatLog({
          requestId,
          step,
          level: "warn",
          ...extra,
        })
      );
    },
    error(step: string, extra?: { message?: string; code?: string; error?: string; durationMs?: number }) {
      console.error(
        formatLog({
          requestId,
          step,
          level: "error",
          ...extra,
        })
      );
    },
  };
}

export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
