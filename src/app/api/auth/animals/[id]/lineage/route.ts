import { NextResponse } from "next/server";

import { requireUser } from "@/lib/user-session";
import { handleApiError } from "@/lib/api-error";
import { getPetLineage } from "@/db/queries";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/animals/[id]/lineage — 当前用户某只宠物的三代族谱。
 *
 * 返回递归树结构：{ pet, father, mother }，最多三层（自己 → 父母 → 祖父母）。
 * 初代宠物返回单节点树（father/mother 均为 null）。
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;

  try {
    const { id } = await ctx.params;
    const lineage = await getPetLineage(guard.user.id, id);
    if (!lineage) {
      return NextResponse.json(fail("NOT_FOUND", "宠物不存在"), { status: 404 });
    }
    return NextResponse.json(ok(lineage));
  } catch (err) {
    return handleApiError("GET /api/auth/animals/[id]/lineage", err);
  }
}
