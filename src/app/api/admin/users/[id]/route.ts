import { NextResponse } from "next/server";

import { requireAdmin, parseJson } from "@/lib/api-guard";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { createAuditLog } from "@/lib/audit-log";
import { getAuthPayload } from "@/lib/auth";
import { adminUserUpdateSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/password";
import { ok, fail } from "@/types";
import {
  updateAdmin,
  deleteAdmin,
  setAdminRole,
  getAdminByUsername,
} from "@/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PUT /api/admin/users/[id] — 更新管理员 */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await ctx.params;
  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const input = adminUserUpdateSchema.parse(data);

    // 不能删除/禁用自己（保护当前登录用户）
    const me = await getAuthPayload();
    if (me?.sub === id && input.isActive === false) {
      return NextResponse.json(
        fail("FORBIDDEN", "不能停用自己的账号"),
        { status: 403 },
      );
    }

    // 唯一性校验（如修改 username）
    if (input.username) {
      const existing = await getAdminByUsername(input.username);
      if (existing && existing.id !== id) {
        return NextResponse.json(
          fail("USERNAME_TAKEN", "用户名已被占用"),
          { status: 409 },
        );
      }
    }

    // 修改密码
    let passwordHash: string | undefined;
    if (input.password && input.password.length > 0) {
      passwordHash = await hashPassword(input.password);
    }

    await updateAdmin(id, {
      ...(input.username !== undefined ? { username: input.username } : {}),
      ...(input.email !== undefined ? { email: input.email ?? undefined } : {}),
      ...(input.name !== undefined ? { name: input.name ?? undefined } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(passwordHash !== undefined ? { passwordHash } : {}),
    });

    if (input.roleId) {
      await setAdminRole(id, input.roleId);
    }

    await createAuditLog({
      action: "user.update",
      resource: "users",
      targetId: id,
      meta: {
        username: input.username,
        email: input.email,
        name: input.name,
        isActive: input.isActive,
        roleId: input.roleId,
        passwordChanged: !!passwordHash,
      },
    });

    return NextResponse.json(ok({ id }));
  } catch (err) {
    if (isZodError(err)) {
      const issues = collectZodIssues(err);
      return NextResponse.json(
        fail("VALIDATION_ERROR", issues.length > 0 ? issues.join("; ") : "参数校验失败"),
        { status: 400 },
      );
    }
    return handleApiError("PUT /api/admin/users/[id]", err);
  }
}

/** DELETE /api/admin/users/[id] — 删除管理员 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await ctx.params;
  try {
    // 不能删除自己
    const me = await getAuthPayload();
    if (me?.sub === id) {
      return NextResponse.json(
        fail("FORBIDDEN", "不能删除自己"),
        { status: 403 },
      );
    }

    await deleteAdmin(id);

    await createAuditLog({
      action: "user.delete",
      resource: "users",
      targetId: id,
    });

    return NextResponse.json(ok({ id }));
  } catch (err) {
    return handleApiError("DELETE /api/admin/users/[id]", err);
  }
}
