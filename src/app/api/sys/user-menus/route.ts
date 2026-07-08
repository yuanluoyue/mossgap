import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api-guard";
import { handleApiError } from "@/lib/api-error";
import { getAuthPayload } from "@/lib/auth";
import { getAdminMenuTree } from "@/db/queries";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/sys/user-menus — 当前登录管理员可见的菜单树 */
export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const payload = await getAuthPayload();
    if (!payload) {
      return NextResponse.json(fail("UNAUTHORIZED", "未登录或登录已过期"), {
        status: 401,
      });
    }

    const tree = await getAdminMenuTree(payload.sub);
    return NextResponse.json(ok({ tree }));
  } catch (err) {
    return handleApiError("GET /api/sys/user-menus", err);
  }
}
