import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api-guard";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { listAllEggs } from "@/db/queries";
import { listEggsQuerySchema } from "@/lib/validators";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/eggs — 蛋列表（分页 + 搜索 + 过滤）。 */
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const url = new URL(req.url);
    const sp = Object.fromEntries(url.searchParams.entries());
    const input = listEggsQuerySchema.parse(sp);

    const result = await listAllEggs({
      page: input.page,
      pageSize: input.pageSize,
      search: input.search,
      status: input.status,
      ownerId: input.ownerId,
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
    return handleApiError("GET /api/admin/eggs", err);
  }
}
