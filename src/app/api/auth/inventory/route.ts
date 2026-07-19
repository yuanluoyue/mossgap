import { NextResponse } from "next/server";

import { requireUser } from "@/lib/user-session";
import { handleApiError } from "@/lib/api-error";
import { listMyInventory } from "@/db/queries";
import { ok } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/inventory — 当前用户的背包内容（仅数量>0 且物品已启用）。
 */
export async function GET() {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;

  try {
    const items = await listMyInventory(guard.user.id);
    return NextResponse.json(ok({ items }));
  } catch (err) {
    return handleApiError("GET /api/auth/inventory", err);
  }
}
