import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/user-session";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/refresh — 主动刷新 access token（用 refresh token）。
 *
 * 客户端可在 401 时调用此接口尝试续期，成功后重试原请求。
 */
export async function POST() {
  const { user, refreshed } = await getCurrentUser();
  if (!user) {
    return NextResponse.json(fail("UNAUTHORIZED", "未登录或登录已过期"), {
      status: 401,
    });
  }
  return NextResponse.json(ok({ user, refreshed }));
}
