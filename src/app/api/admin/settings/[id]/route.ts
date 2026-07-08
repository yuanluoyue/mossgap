import { NextResponse } from "next/server";

import { requireAdmin, parseJson } from "@/lib/api-guard";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { createAuditLog } from "@/lib/audit-log";
import { updateSetting, deleteSetting } from "@/db/queries";
import { settingUpdateSchema } from "@/lib/validators";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PUT /api/admin/settings/[id] — 更新配置 */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await ctx.params;
  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const input = settingUpdateSchema.parse(data);
    await updateSetting(id, input);

    await createAuditLog({
      action: "setting.update",
      resource: "settings",
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
    return handleApiError("PUT /api/admin/settings/[id]", err);
  }
}

/** DELETE /api/admin/settings/[id] — 删除配置 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await ctx.params;
  try {
    await deleteSetting(id);

    await createAuditLog({
      action: "setting.delete",
      resource: "settings",
      targetId: id,
    });

    return NextResponse.json(ok({ id }));
  } catch (err) {
    return handleApiError("DELETE /api/admin/settings/[id]", err);
  }
}
