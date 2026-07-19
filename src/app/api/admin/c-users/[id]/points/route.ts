import { NextResponse } from "next/server";

import { requireAdmin, parseJson } from "@/lib/api-guard";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { getAuthPayload } from "@/lib/auth";
import { adjustPoints, listUserPointLogs, getUserPointBalance } from "@/db/queries";
import { adminAdjustPointsSchema, listPointLogsQuerySchema } from "@/lib/validators";
import { createAuditLog } from "@/lib/audit-log";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/c-users/[id]/points — 查询某用户积分日志（分页）。
 *
 * Query:
 *   - page (default 1)
 *   - pageSize (default 10, max 100)
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id: userId } = await ctx.params;

  const url = new URL(req.url);
  const parsed = listPointLogsQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? "1",
    pageSize: url.searchParams.get("pageSize") ?? "10",
  });
  if (!parsed.success) {
    return NextResponse.json(fail("VALIDATION_ERROR", "参数不合法"), { status: 400 });
  }

  const [logs, balance] = await Promise.all([
    listUserPointLogs(userId, {
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    }),
    getUserPointBalance(userId),
  ]);

  return NextResponse.json(ok({ ...logs, balance }));
}

/**
 * POST /api/admin/c-users/[id]/points — B 端手动调整积分。
 *
 * Body:
 *   - change: number (非 0，正数增加，负数扣减)
 *   - remark?: string
 *
 * 写入 type="adjust" 日志，bizType="admin_adjust"，bizId=adminId（来自 JWT sub）。
 * 同时写一条操作日志（admin_operation_logs）。
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id: userId } = await ctx.params;

  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  let input: { change: number; remark: string | null };
  try {
    input = adminAdjustPointsSchema.parse(data);
  } catch (err) {
    if (isZodError(err)) {
      const issues = collectZodIssues(err);
      return NextResponse.json(
        fail("VALIDATION_ERROR", issues.length > 0 ? issues.join("; ") : "参数校验失败"),
        { status: 400 },
      );
    }
    return handleApiError("POST /api/admin/c-users/[id]/points", err);
  }

  const payload = await getAuthPayload();
  const adminId = payload?.sub ?? "unknown";

  const result = await adjustPoints({
    userId,
    change: input.change,
    type: "adjust",
    bizType: "admin_adjust",
    bizId: adminId,
    remark: input.remark ?? undefined,
  });

  if (!result) {
    return NextResponse.json(fail("INVALID_CHANGE", "变动值不能为 0"), { status: 400 });
  }

  // 操作日志（敏感操作）
  await createAuditLog({
    action: "adjust_points",
    resource: "c_user",
    targetId: userId,
    meta: {
      change: input.change,
      balanceAfter: result.balance,
      remark: input.remark,
    },
  });

  return NextResponse.json(ok({ balance: result.balance, logId: result.logId }));
}
