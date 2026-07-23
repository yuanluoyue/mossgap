import { NextResponse } from "next/server";

import { requireUser } from "@/lib/user-session";
import { handleApiError } from "@/lib/api-error";
import { listMyEggs } from "@/db/queries";
import { ok } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/auth/eggs — 当前用户的蛋列表。 */
export async function GET() {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;

  try {
    const eggs = await listMyEggs(guard.user.id);
    return NextResponse.json(ok({ eggs }));
  } catch (err) {
    return handleApiError("GET /api/auth/eggs", err);
  }
}
