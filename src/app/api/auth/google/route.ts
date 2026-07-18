import { NextResponse } from "next/server";

import {
  buildGoogleAuthUrl,
  isGoogleConfigured,
  issueStateAndCookie,
} from "@/lib/user-auth";
import { fail } from "@/types";
import { hasServerEnv } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/google
 *
 * 跳转到 Google OAuth 授权页。
 * Query:
 *   - next: 登录后跳转的站内路径（默认 "/"）
 *
 * 未配置 Google OAuth 时返回 503，前端可提示。
 */
export async function GET(req: Request) {
  if (!(await hasServerEnv()) || !(await isGoogleConfigured())) {
    return NextResponse.json(
      fail("OAUTH_NOT_CONFIGURED", "Google OAuth 未配置"),
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const next = url.searchParams.get("next") ?? "/";
  // 仅允许站内路径，防开放重定向
  if (!next.startsWith("/") || next.startsWith("//")) {
    return NextResponse.json(
      fail("BAD_REQUEST", "next 参数必须是站内路径"),
      { status: 400 },
    );
  }

  // state：32 字节随机 hex
  const stateBytes = new Uint8Array(16);
  crypto.getRandomValues(stateBytes);
  const state = Array.from(stateBytes, (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");

  await issueStateAndCookie(state);
  const authUrl = await buildGoogleAuthUrl({ state, next });
  return NextResponse.redirect(authUrl);
}
