import { NextResponse } from "next/server";

import { requireUser } from "@/lib/user-session";
import { handleApiError } from "@/lib/api-error";
import { claimMissionReward } from "@/db/queries";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/missions/[id]/claim — 领取任务奖励。
 *
 * id 是 user_mission.id（不是 mission.id）。
 * 必须是当前登录用户自己的 user_mission，且 status=completed。
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;

  const { id: userMissionId } = await ctx.params;

  try {
    const res = await claimMissionReward(userMissionId, guard.user.id);
    if (!res.ok) {
      const map: Record<string, { code: string; message: string; status: number }> = {
        not_found: { code: "NOT_FOUND", message: "任务记录不存在", status: 404 },
        not_completed: { code: "NOT_COMPLETED", message: "任务尚未完成", status: 400 },
        already_claimed: { code: "ALREADY_CLAIMED", message: "奖励已领取", status: 409 },
        forbidden: { code: "FORBIDDEN", message: "无权操作此任务", status: 403 },
      };
      const info = map[res.reason];
      return NextResponse.json(fail(info.code, info.message), { status: info.status });
    }
    return NextResponse.json(ok({ balance: res.balance, reward: res.reward }));
  } catch (err) {
    return handleApiError("POST /api/auth/missions/[id]/claim", err);
  }
}
