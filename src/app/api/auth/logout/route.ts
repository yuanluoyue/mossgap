import { NextResponse } from "next/server";

import { clearUserCookies, getRefreshTokenFromCookie, hashToken } from "@/lib/user-auth";
import { revokeSessionByHash } from "@/db/queries";
import { ok } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/auth/logout — 登出（撤销当前 session，清 cookie）。 */
export async function POST() {
  const refreshToken = await getRefreshTokenFromCookie();
  if (refreshToken) {
    try {
      const hash = await hashToken(refreshToken);
      await revokeSessionByHash(hash);
    } catch {
      // 即使 DB 撤销失败也清 cookie，让客户端登出
    }
  }
  await clearUserCookies();
  return NextResponse.json(ok({}));
}
