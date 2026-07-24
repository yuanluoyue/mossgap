import { NextResponse } from "next/server";

import { requireUser } from "@/lib/user-session";
import { handleApiError } from "@/lib/api-error";
import { createAuditLog } from "@/lib/audit-log";
import { cancelMyBreedOrder } from "@/db/queries";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/market/breed/[id]/cancel — C 端用户取消自己的挂单。
 *
 * - 仅 OPEN 状态可取消
 * - 仅 owner 可取消
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;

  try {
    const { id } = await ctx.params;
    const result = await cancelMyBreedOrder(guard.user.id, id);

    if (!result.ok) {
      const codeMap: Record<string, string> = {
        not_found: "NOT_FOUND",
        not_owner: "NOT_OWNER",
        not_open: "NOT_OPEN",
      };
      const statusMap: Record<string, number> = {
        not_found: 404,
        not_owner: 403,
        not_open: 400,
      };
      return NextResponse.json(
        fail(codeMap[result.reason] ?? "FAILED", result.reason),
        { status: statusMap[result.reason] ?? 400 },
      );
    }

    await createAuditLog({
      action: "market.cancel",
      resource: "breed_market_orders",
      targetId: id,
      meta: { operator: "owner" },
    });

    return NextResponse.json(ok({}));
  } catch (err) {
    return handleApiError("POST /api/market/breed/[id]/cancel", err);
  }
}
