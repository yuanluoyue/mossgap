import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/user-session";
import { listMyPointLogs } from "@/db/queries";
import { listMyPointLogsQuerySchema } from "@/lib/validators";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/auth/points/logs — 当前登录用户的积分变动日志（分页）。 */
export async function GET(req: Request) {
  const { user } = await getCurrentUser();
  if (!user) {
    return NextResponse.json(fail("UNAUTHORIZED", "请先登录"), { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = listMyPointLogsQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? "1",
    pageSize: url.searchParams.get("pageSize") ?? "10",
  });
  if (!parsed.success) {
    return NextResponse.json(fail("VALIDATION_ERROR", "参数不合法"), { status: 400 });
  }

  const result = await listMyPointLogs(user.id, {
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
  });

  return NextResponse.json(ok(result));
}
