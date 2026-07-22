import { NextResponse } from "next/server";

import { requireUser } from "@/lib/user-session";
import { handleApiError } from "@/lib/api-error";
import { listMyAnimals } from "@/db/queries";
import { ok } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/animals — 当前用户的全部宠物（按创建时间倒序）。
 */
export async function GET() {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;

  try {
    const pets = await listMyAnimals(guard.user.id);
    return NextResponse.json(ok({ pets }));
  } catch (err) {
    return handleApiError("GET /api/auth/animals", err);
  }
}
