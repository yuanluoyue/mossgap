import { NextResponse } from "next/server";

import { requireAdmin, parseJson } from "@/lib/api-guard";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { createAuditLog } from "@/lib/audit-log";
import { adminUpdateBreedOrderPrice } from "@/db/queries";
import { breedOrderPriceUpdateSchema } from "@/lib/validators";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/breed-market/[id]/price — B 端修改挂单价格。
 *
 * 入参：{ price: number }
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const { id } = await ctx.params;
    const input = breedOrderPriceUpdateSchema.parse(data);
    const result = await adminUpdateBreedOrderPrice(id, input.price);

    if (!result.ok) {
      const codeMap: Record<string, string> = {
        not_found: "NOT_FOUND",
        invalid_price: "INVALID_PRICE",
      };
      const statusMap: Record<string, number> = {
        not_found: 404,
        invalid_price: 400,
      };
      return NextResponse.json(
        fail(codeMap[result.reason] ?? "FAILED", result.reason),
        { status: statusMap[result.reason] ?? 400 },
      );
    }

    await createAuditLog({
      action: "market.admin_update_price",
      resource: "breed_market_orders",
      targetId: id,
      meta: { price: input.price },
    });

    return NextResponse.json(ok({ order: result.order }));
  } catch (err) {
    if (isZodError(err)) {
      const issues = collectZodIssues(err);
      return NextResponse.json(
        fail("VALIDATION_ERROR", issues.length > 0 ? issues.join("; ") : "参数校验失败"),
        { status: 400 },
      );
    }
    return handleApiError("PATCH /api/admin/breed-market/[id]/price", err);
  }
}
