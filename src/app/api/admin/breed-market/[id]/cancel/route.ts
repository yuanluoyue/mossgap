import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api-guard";
import { handleApiError } from "@/lib/api-error";
import { createAuditLog } from "@/lib/audit-log";
import { adminCancelBreedOrder } from "@/db/queries";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/breed-market/[id]/cancel — B 端取消任意挂单。
 *
 * - 仅 OPEN 状态可取消
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const { id } = await ctx.params;
    const result = await adminCancelBreedOrder(id);

    if (!result.ok) {
      const codeMap: Record<string, string> = {
        not_found: "NOT_FOUND",
        not_open: "NOT_OPEN",
      };
      const statusMap: Record<string, number> = {
        not_found: 404,
        not_open: 400,
      };
      return NextResponse.json(
        fail(codeMap[result.reason] ?? "FAILED", result.reason),
        { status: statusMap[result.reason] ?? 400 },
      );
    }

    await createAuditLog({
      action: "market.admin_cancel",
      resource: "breed_market_orders",
      targetId: id,
      meta: { operator: "admin" },
    });

    return NextResponse.json(ok({}));
  } catch (err) {
    return handleApiError("POST /api/admin/breed-market/[id]/cancel", err);
  }
}
