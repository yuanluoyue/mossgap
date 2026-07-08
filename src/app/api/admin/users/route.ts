import { NextResponse } from "next/server";

import { requireAdmin, parseJson } from "@/lib/api-guard";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { createAuditLog } from "@/lib/audit-log";
import {
  listAdmins,
  createAdmin,
  setAdminRole,
  getAdminByUsername,
} from "@/db/queries";
import { adminUserCreateSchema, listAdminsQuerySchema } from "@/lib/validators";
import { hashPassword } from "@/lib/password";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/users — 管理员列表（分页 + 搜索） */
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const url = new URL(req.url);
    const sp = Object.fromEntries(url.searchParams.entries());
    const input = listAdminsQuerySchema.parse(sp);

    const result = await listAdmins({
      page: input.page,
      pageSize: input.pageSize,
      search: input.search,
    });

    return NextResponse.json(ok(result));
  } catch (err) {
    if (isZodError(err)) {
      const issues = collectZodIssues(err);
      return NextResponse.json(
        fail("VALIDATION_ERROR", issues.length > 0 ? issues.join("; ") : "参数校验失败"),
        { status: 400 },
      );
    }
    return handleApiError("GET /api/admin/users", err);
  }
}

/** POST /api/admin/users — 创建管理员（含密码哈希 + 角色） */
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const input = adminUserCreateSchema.parse(data);

    // 唯一性校验
    const existing = await getAdminByUsername(input.username);
    if (existing) {
      return NextResponse.json(
        fail("USERNAME_TAKEN", "用户名已被占用"),
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(input.password);
    const id = await createAdmin({
      username: input.username,
      passwordHash,
      email: input.email ?? undefined,
      name: input.name ?? undefined,
    });

    await setAdminRole(id, input.roleId);

    await createAuditLog({
      action: "user.create",
      resource: "users",
      targetId: id,
      meta: { username: input.username, roleId: input.roleId },
    });

    return NextResponse.json(ok({ id }), { status: 201 });
  } catch (err) {
    if (isZodError(err)) {
      const issues = collectZodIssues(err);
      return NextResponse.json(
        fail("VALIDATION_ERROR", issues.length > 0 ? issues.join("; ") : "参数校验失败"),
        { status: 400 },
      );
    }
    return handleApiError("POST /api/admin/users", err);
  }
}
