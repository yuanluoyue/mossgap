import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api-guard";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { listAllBreedOrders } from "@/db/queries";
import { listBreedOrdersQuerySchema } from "@/lib/validators";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/breed-market — B 端订单列表（分页 + 搜索 + 状态筛选）。 */
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const url = new URL(req.url);
    const sp = Object.fromEntries(url.searchParams.entries());
    const input = listBreedOrdersQuerySchema.parse(sp);

    const result = await listAllBreedOrders({
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
    return handleApiError("GET /api/admin/breed-market", err);
  }
}
