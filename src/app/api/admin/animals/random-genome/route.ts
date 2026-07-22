import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api-guard";
import { handleApiError } from "@/lib/api-error";
import { generateRandomGenome } from "@/db/queries";
import { ok } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/animals/random-genome — 生成一份随机基因组（不落库）。 */
export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const genome = generateRandomGenome();
    return NextResponse.json(ok({ genome }));
  } catch (err) {
    return handleApiError("GET /api/admin/animals/random-genome", err);
  }
}
