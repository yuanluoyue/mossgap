import { NextResponse } from "next/server";

import { getAuthPayload } from "@/lib/auth";
import { getAdminById, getAdminRoleIds, listSysRoles } from "@/db/queries";
import { ok } from "@/types";
import { hasServerEnv } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/me — 当前登录管理员的完整信息（含角色） */
export async function GET() {
  if (!hasServerEnv()) {
    return NextResponse.json(
      { success: false, authenticated: false, configured: false },
      { status: 503 },
    );
  }

  const payload = await getAuthPayload();
  if (!payload) {
    return NextResponse.json(ok({ authenticated: false }));
  }

  const admin = await getAdminById(payload.sub);
  if (!admin) {
    return NextResponse.json(ok({ authenticated: false }));
  }

  // 查询当前用户的角色（取首个，与列表展示保持一致）
  const roleIds = await getAdminRoleIds(admin.id);
  let role: { id: string; name: string; code: string } | null = null;
  if (roleIds.length > 0) {
    const allRoles = await listSysRoles();
    const found = allRoles.find((r) => r.id === roleIds[0]);
    if (found) {
      role = { id: found.id, name: found.name, code: found.code };
    }
  }

  return NextResponse.json(
    ok({
      authenticated: true,
      user: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        name: admin.name,
        avatar: admin.avatar,
        isActive: (admin.isActive ?? 1) === 1,
        createdAt: admin.createdAt,
        role,
      },
    }),
  );
}
