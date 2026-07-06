import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/auth";
import { ok } from "@/types";
import { hasServerEnv } from "@/env";

export const runtime = "nodejs";

/** GET /api/admin/me — 检查当前登录态 */
export async function GET() {
  if (!hasServerEnv()) {
    return NextResponse.json(
      { success: false, authenticated: false, configured: false },
      { status: 503 },
    );
  }
  const authenticated = await isAdminAuthenticated();
  return NextResponse.json(ok({ authenticated }));
}
