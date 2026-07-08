import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api-guard";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { listAuditLogs } from "@/db/queries";
import { listAuditLogsQuerySchema } from "@/lib/validators";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/audit-logs — 操作日志（分页 + 筛选） */
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const url = new URL(req.url);
    const sp = Object.fromEntries(url.searchParams.entries());
    const input = listAuditLogsQuerySchema.parse(sp);

    const result = await listAuditLogs({
      page: input.page,
      pageSize: input.pageSize,
      resource: input.resource,
      action: input.action,
      user: input.user,
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
    return handleApiError("GET /api/admin/audit-logs", err);
  }
}
