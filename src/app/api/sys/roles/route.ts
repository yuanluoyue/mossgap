import { NextResponse } from "next/server";

import { requireAdmin, parseJson } from "@/lib/api-guard";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { createAuditLog } from "@/lib/audit-log";
import { listSysRoles, createSysRole, setRoleMenus } from "@/db/queries";
import { sysRoleCreateSchema } from "@/lib/validators";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/sys/roles — 全部角色（含 menuIds） */
export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const items = await listSysRoles();
    return NextResponse.json(ok({ items }));
  } catch (err) {
    return handleApiError("GET /api/sys/roles", err);
  }
}

/** POST /api/sys/roles — 创建角色并授权菜单 */
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const input = sysRoleCreateSchema.parse(data);
    const id = await createSysRole({
      name: input.name,
      code: input.code,
      description: input.description,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    });

    if (input.menuIds.length > 0) {
      await setRoleMenus(id, input.menuIds);
    }

    await createAuditLog({
      action: "role.create",
      resource: "roles",
      targetId: id,
      meta: { name: input.name, code: input.code, menuIds: input.menuIds },
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
    return handleApiError("POST /api/sys/roles", err);
  }
}
