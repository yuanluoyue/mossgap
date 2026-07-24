import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/user-session";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { parseJson } from "@/lib/api-guard";
import { claimOnlineDurationReward } from "@/db/queries";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const claimSchema = z.object({
  minutes: z.number().int().min(1).max(1440),
});

/**
 * POST /api/auth/missions/online-duration/claim
 *
 * 在线时长奖励领取。在线时长由前端统计，服务端按 minutes 匹配
 * event=ONLINE_DURATION 的 daily 任务并发放奖励。
 * 防重复：user_mission (userId, missionId, cycleKey) 唯一索引。
 */
export async function POST(req: Request) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;

  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const input = claimSchema.parse(data);
    const result = await claimOnlineDurationReward(
      guard.user.id,
      input.minutes,
    );

    if (!result.ok) {
      const codeMap: Record<string, string> = {
        mission_not_found: "MISSION_NOT_FOUND",
        already_claimed: "ALREADY_CLAIMED",
      };
      const statusMap: Record<string, number> = {
        mission_not_found: 404,
        already_claimed: 409,
      };
      return NextResponse.json(
        fail(codeMap[result.reason] ?? "FAILED", result.reason),
        { status: statusMap[result.reason] ?? 400 },
      );
    }

    return NextResponse.json(
      ok({ balance: result.balance, reward: result.reward }),
    );
  } catch (err) {
    if (isZodError(err)) {
      const issues = collectZodIssues(err);
      return NextResponse.json(
        fail(
          "VALIDATION_ERROR",
          issues.length > 0 ? issues.join("; ") : "参数校验失败",
        ),
        { status: 400 },
      );
    }
    return handleApiError("POST /api/auth/missions/online-duration/claim", err);
  }
}
