import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/user-session";
import { ok } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/auth/me — 当前 C 端登录用户信息（含自动 refresh）。 */
export async function GET() {
  const { user } = await getCurrentUser();
  if (!user) {
    return NextResponse.json(ok({ authenticated: false }));
  }
  return NextResponse.json(ok({ authenticated: true, user }));
}
