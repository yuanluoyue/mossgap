import { NextResponse } from "next/server";

import { requireAdmin, parseJson } from "@/lib/api-guard";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { createAuditLog } from "@/lib/audit-log";
import { updateSysRole, deleteSysRole, setRoleMenus } from "@/db/queries";
import { sysRoleUpdateSchema } from "@/lib/validators";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PUT /api/sys/roles/[id] — 更新角色（若提供 menuIds 则同步授权） */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await ctx.params;
  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const input = sysRoleUpdateSchema.parse(data);
    const { menuIds, ...rest } = input;

    await updateSysRole(id, rest);

    if (menuIds !== undefined) {
      await setRoleMenus(id, menuIds);
    }

    await createAuditLog({
      action: "role.update",
      resource: "roles",
      targetId: id,
      meta: input,
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
    return handleApiError("PUT /api/sys/roles/[id]", err);
  }
}

/** DELETE /api/sys/roles/[id] — 删除角色 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await ctx.params;
  try {
    await deleteSysRole(id);

    await createAuditLog({
      action: "role.delete",
      resource: "roles",
      targetId: id,
    });

    return NextResponse.json(ok({ id }));
  } catch (err) {
    return handleApiError("DELETE /api/sys/roles/[id]", err);
  }
}
