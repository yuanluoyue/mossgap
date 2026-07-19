import { NextResponse } from "next/server";

import { requireAdmin, parseJson } from "@/lib/api-guard";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { createAuditLog } from "@/lib/audit-log";
import { createMission, listAllMissions } from "@/db/queries";
import { listMissionsQuerySchema, missionCreateSchema } from "@/lib/validators";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/missions — 任务列表（分页 + 搜索 + 过滤）。 */
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const url = new URL(req.url);
    const sp = Object.fromEntries(url.searchParams.entries());
    const input = listMissionsQuerySchema.parse(sp);

    const result = await listAllMissions({
      page: input.page,
      pageSize: input.pageSize,
      search: input.search,
      type: input.type,
      enabled: input.enabled,
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
    return handleApiError("GET /api/admin/missions", err);
  }
}

/** POST /api/admin/missions — 创建任务。 */
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const input = missionCreateSchema.parse(data);
    const mission = await createMission({
      name: input.name,
      description: input.description,
      type: input.type,
      event: input.event,
      target: input.target,
      rewardType: input.rewardType,
      rewardValue: input.rewardValue,
      icon: input.icon,
      sortOrder: input.sortOrder,
      enabled: input.enabled,
      startAt: input.startAt,
      endAt: input.endAt,
    });

    await createAuditLog({
      action: "mission.create",
      resource: "missions",
      targetId: mission.id,
      meta: { name: mission.name, type: mission.type, event: mission.event },
    });

    return NextResponse.json(ok({ mission }), { status: 201 });
  } catch (err) {
    if (isZodError(err)) {
      const issues = collectZodIssues(err);
      return NextResponse.json(
        fail("VALIDATION_ERROR", issues.length > 0 ? issues.join("; ") : "参数校验失败"),
        { status: 400 },
      );
    }
    return handleApiError("POST /api/admin/missions", err);
  }
}
