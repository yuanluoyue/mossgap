import { NextResponse } from "next/server";

import { requireUser } from "@/lib/user-session";
import { handleApiError } from "@/lib/api-error";
import { triggerMissionEvent, claimMissionReward } from "@/db/queries";
import { ok } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/missions/check-in — 每日签到。
 *
 * 流程：
 * 1. 触发 LOGIN 事件 → 推进所有 event=LOGIN 的 daily 任务进度到 target
 * 2. 自动领取已 completed 的任务奖励
 *
 * 返回最新的任务列表 + 余额。
 */
export async function POST() {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;

  try {
    // 1. 触发 LOGIN 事件
    const updated = await triggerMissionEvent({
      userId: guard.user.id,
      event: "LOGIN",
      amount: 1,
    });

    // 2. 自动领取所有 completed 的任务
    let balance = guard.user.pointBalance;
    const claimed: { missionId: string; reward: number }[] = [];
    for (const um of updated) {
      if (um.status === "completed") {
        const res = await claimMissionReward(um.id);
        if (res.ok) {
          balance = res.balance;
          claimed.push({ missionId: um.missionId, reward: res.reward });
        }
      }
    }

    return NextResponse.json(ok({ balance, claimed, updated: updated.length }));
  } catch (err) {
    return handleApiError("POST /api/auth/missions/check-in", err);
  }
}
