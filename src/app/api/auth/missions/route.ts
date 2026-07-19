import { NextResponse } from "next/server";

import { requireUser } from "@/lib/user-session";
import { handleApiError } from "@/lib/api-error";
import { listMyMissions } from "@/db/queries";
import { ok } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/missions — 当前用户的任务列表（当前周期内）。
 *
 * 懒创建：若 user_mission 不存在，会先 INSERT 再返回。
 */
export async function GET() {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;

  try {
    const items = await listMyMissions(guard.user.id);
    return NextResponse.json(ok({ items }));
  } catch (err) {
    return handleApiError("GET /api/auth/missions", err);
  }
}
