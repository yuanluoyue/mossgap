import { NextResponse } from "next/server";

import { fail } from "@/types";

/**
 * 稳健识别 ZodError。
 *
 * 不依赖 `instanceof ZodError`，因为项目可能存在多个 zod 版本
 * （drizzle-zod 等依赖可能引入不同 zod 实例），导致 instanceof 失败，
 * 校验错误被错误地归为 500 内部错误。
 *
 * 判据（满足任一即认为是 ZodError）：
 * - err.name === "ZodError"
 * - 拥有 issues 数组（Zod v3/v4 通用结构）
 */
export function isZodError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: unknown; issues?: unknown };
  return e.name === "ZodError" || Array.isArray(e.issues);
}

/** 提取 ZodError 的所有 issue 消息（用于响应和日志）。 */
export function collectZodIssues(err: unknown): string[] {
  if (!err || typeof err !== "object") return [];
  const e = err as { issues?: unknown; errors?: unknown };
  const list = (e.issues ?? e.errors) as
    | { message?: string; path?: unknown[] }[]
    | undefined;
  if (!Array.isArray(list)) return [];
  return list.map((it) => {
    const path = Array.isArray(it.path) && it.path.length > 0
      ? it.path.join(".")
      : null;
    return path ? `${path}: ${it.message ?? "校验失败"}` : (it.message ?? "校验失败");
  });
}

/**
 * 把任意错误打印到服务端控制台（含 name / message / stack / cause / issues）。
 *
 * 这是排查 500 的关键：之前 catch 块只返回错误码，没有任何日志，
 * 导致无法定位真实原因。现在统一在此打印完整详情。
 *
 * ZodError 用 console.warn：参数校验失败属于业务错误（用户提交非法输入），
 * 不应上报为系统错误触发告警。真正的服务端异常才用 console.error。
 */
export function logApiError(context: string, err: unknown): void {
  const ts = new Date().toISOString();
  if (isZodError(err)) {
    const issues = collectZodIssues(err);
    console.warn(`[${ts}] [API WARN] ${context} · ZodError`, {
      context,
      issues,
      allIssues: (err as { issues?: unknown }).issues,
    });
    return;
  }
  if (err instanceof Error) {
    console.error(`[${ts}] [API ERROR] ${context} · ${err.name}: ${err.message}`, {
      context,
      name: err.name,
      message: err.message,
      stack: err.stack,
      cause: err.cause,
    });
    return;
  }
  console.error(`[${ts}] [API ERROR] ${context} · 未知错误`, {
    context,
    error: err,
  });
}

/**
 * 统一处理 API 路由的 catch：
 * 1. 打印完整错误日志
 * 2. ZodError → 400 VALIDATION_ERROR（附带所有 issue）
 * 3. 其他 → 500 INTERNAL（开发环境附带错误信息便于排查）
 */
export function handleApiError(
  context: string,
  err: unknown,
): NextResponse {
  logApiError(context, err);

  if (isZodError(err)) {
    const issues = collectZodIssues(err);
    const message = issues.length > 0 ? issues.join("; ") : "参数校验失败";
    return NextResponse.json(
      fail("VALIDATION_ERROR", message),
      { status: 400 },
    );
  }

  const detail = err instanceof Error ? err.message : String(err);
  return NextResponse.json(
    fail("INTERNAL", `服务器内部错误: ${detail}`),
    { status: 500 },
  );
}
