import { NextResponse } from "next/server";

import { getCurrentUserOrNull, requireUser } from "@/lib/user-session";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { parseJson } from "@/lib/api-guard";
import { createAuditLog } from "@/lib/audit-log";
import { listOpenBreedOrders, listMyBreedOrders, createBreedOrder } from "@/db/queries";
import { breedOrderCreateSchema } from "@/lib/validators";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/market/breed — 列出市场挂单。
 *
 * - 公开访问（游客可见），用于市场页展示
 * - 登录用户：excludeOwnerId = 自己，不展示自己的挂单
 * - 可选 query: ?mine=1 查看自己的挂单（需登录）
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mine = url.searchParams.get("mine") === "1";

    if (mine) {
      // 查看自己的挂单（需登录）
      const guard = await requireUser();
      if (guard instanceof NextResponse) return guard;
      const orders = await listMyBreedOrders(guard.user.id);
      return NextResponse.json(ok({ orders }));
    }

    // 公开列表：登录则排除自己的
    const user = await getCurrentUserOrNull();
    const orders = await listOpenBreedOrders({
      excludeOwnerId: user?.id,
    });
    return NextResponse.json(ok({ orders }));
  } catch (err) {
    return handleApiError("GET /api/market/breed", err);
  }
}

/**
 * POST /api/market/breed — 创建挂单（需登录）。
 *
 * 入参：{ animalId, price, description? }
 */
export async function POST(req: Request) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;

  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const input = breedOrderCreateSchema.parse(data);
    const result = await createBreedOrder(guard.user.id, {
      animalId: input.animalId,
      price: input.price,
      description: input.description,
    });

    if (!result.ok) {
      const codeMap: Record<string, string> = {
        pet_not_found: "PET_NOT_FOUND",
        not_owner: "NOT_OWNER",
        cooldown: "COOLDOWN",
        already_listing: "ALREADY_LISTING",
        invalid_price: "INVALID_PRICE",
        invalid_description: "INVALID_DESCRIPTION",
      };
      return NextResponse.json(
        fail(codeMap[result.reason] ?? "FAILED", result.reason),
        { status: 400 },
      );
    }

    await createAuditLog({
      action: "market.create",
      resource: "breed_market_orders",
      targetId: result.order.id,
      meta: {
        animalId: result.order.animalId,
        price: result.order.price,
      },
    });

    return NextResponse.json(ok({ order: result.order }), { status: 201 });
  } catch (err) {
    if (isZodError(err)) {
      const issues = collectZodIssues(err);
      return NextResponse.json(
        fail("VALIDATION_ERROR", issues.length > 0 ? issues.join("; ") : "参数校验失败"),
        { status: 400 },
      );
    }
    return handleApiError("POST /api/market/breed", err);
  }
}
