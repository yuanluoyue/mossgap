import { NextResponse } from "next/server";

import { requireAdmin, parseJson } from "@/lib/api-guard";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { createAuditLog } from "@/lib/audit-log";
import { listSysMenus, createSysMenu } from "@/db/queries";
import { sysMenuCreateSchema } from "@/lib/validators";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/sys/menus — 全部菜单（扁平，按 sortOrder 升序） */
export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const items = await listSysMenus();
    return NextResponse.json(ok({ items }));
  } catch (err) {
    return handleApiError("GET /api/sys/menus", err);
  }
}

/** POST /api/sys/menus — 创建菜单 */
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const input = sysMenuCreateSchema.parse(data);
    const id = await createSysMenu({
      name: input.name,
      path: input.path ?? null,
      parentId: input.parentId ?? null,
      icon: input.icon ?? null,
      sortOrder: input.sortOrder ?? 0,
      isVisible: input.isVisible !== false,
    });

    await createAuditLog({
      action: "menu.create",
      resource: "menus",
      targetId: id,
      meta: { name: input.name, path: input.path, parentId: input.parentId },
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
    return handleApiError("POST /api/sys/menus", err);
  }
}
