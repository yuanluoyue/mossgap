import { NextResponse } from "next/server";

import { requireAdmin, parseJson } from "@/lib/api-guard";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { createAuditLog } from "@/lib/audit-log";
import { deleteMission, getMissionById, updateMission } from "@/db/queries";
import { missionUpdateSchema } from "@/lib/validators";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/missions/[id] — 任务详情。 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await ctx.params;
  const mission = await getMissionById(id);
  if (!mission) {
    return NextResponse.json(fail("NOT_FOUND", "任务不存在"), { status: 404 });
  }
  return NextResponse.json(ok({ mission }));
}

/** PUT /api/admin/missions/[id] — 更新任务。 */
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await ctx.params;
  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const input = missionUpdateSchema.parse(data);
    const before = await getMissionById(id);
    if (!before) {
      return NextResponse.json(fail("NOT_FOUND", "任务不存在"), { status: 404 });
    }

    const mission = await updateMission(id, {
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
      action: "mission.update",
      resource: "missions",
      targetId: id,
      meta: {
        before: {
          name: before.name,
          type: before.type,
          event: before.event,
          target: before.target,
          rewardValue: before.rewardValue,
          enabled: before.enabled,
        },
        after: mission
          ? {
              name: mission.name,
              type: mission.type,
              event: mission.event,
              target: mission.target,
              rewardValue: mission.rewardValue,
              enabled: mission.enabled,
            }
          : null,
      },
    });

    return NextResponse.json(ok({ mission }));
  } catch (err) {
    if (isZodError(err)) {
      const issues = collectZodIssues(err);
      return NextResponse.json(
        fail("VALIDATION_ERROR", issues.length > 0 ? issues.join("; ") : "参数校验失败"),
        { status: 400 },
      );
    }
    return handleApiError("PUT /api/admin/missions/[id]", err);
  }
}

/** DELETE /api/admin/missions/[id] — 删除任务（cascade user_missions）。 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await ctx.params;
  const before = await getMissionById(id);
  if (!before) {
    return NextResponse.json(fail("NOT_FOUND", "任务不存在"), { status: 404 });
  }

  await deleteMission(id);

  await createAuditLog({
    action: "mission.delete",
    resource: "missions",
    targetId: id,
    meta: { name: before.name, type: before.type, event: before.event },
  });

  return NextResponse.json(ok({}));
}
