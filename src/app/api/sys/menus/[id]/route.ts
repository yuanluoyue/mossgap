import { NextResponse } from "next/server";

import { requireAdmin, parseJson } from "@/lib/api-guard";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { createAuditLog } from "@/lib/audit-log";
import { updateSysMenu, deleteSysMenu } from "@/db/queries";
import { sysMenuUpdateSchema } from "@/lib/validators";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PUT /api/sys/menus/[id] — 更新菜单 */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await ctx.params;
  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const input = sysMenuUpdateSchema.parse(data);

    // 防止把菜单的 parentId 设为自己，避免循环引用
    if (input.parentId === id) {
      return NextResponse.json(
        fail("VALIDATION_ERROR", "不能将菜单的父级设为自己"),
        { status: 400 },
      );
    }

    await updateSysMenu(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.path !== undefined ? { path: input.path } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isVisible !== undefined ? { isVisible: input.isVisible } : {}),
    });

    await createAuditLog({
      action: "menu.update",
      resource: "menus",
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
    return handleApiError("PUT /api/sys/menus/[id]", err);
  }
}

/** DELETE /api/sys/menus/[id] — 删除菜单 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await ctx.params;
  try {
    await deleteSysMenu(id);

    await createAuditLog({
      action: "menu.delete",
      resource: "menus",
      targetId: id,
    });

    return NextResponse.json(ok({ id }));
  } catch (err) {
    return handleApiError("DELETE /api/sys/menus/[id]", err);
  }
}
