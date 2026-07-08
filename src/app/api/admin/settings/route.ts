import { NextResponse } from "next/server";

import { requireAdmin, parseJson } from "@/lib/api-guard";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { createAuditLog } from "@/lib/audit-log";
import { listSettings, createSetting } from "@/db/queries";
import { settingCreateSchema } from "@/lib/validators";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/settings — 全部系统配置 */
export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const items = await listSettings();
    return NextResponse.json(ok({ items }));
  } catch (err) {
    return handleApiError("GET /api/admin/settings", err);
  }
}

/** POST /api/admin/settings — 新增配置 */
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const input = settingCreateSchema.parse(data);
    const id = await createSetting({
      key: input.key,
      value: input.value,
      remark: input.remark,
    });

    await createAuditLog({
      action: "setting.create",
      resource: "settings",
      targetId: id,
      meta: { key: input.key },
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
    return handleApiError("POST /api/admin/settings", err);
  }
}
