import { NextResponse } from "next/server";

import { getAdminGame, updateGame } from "@/db/queries";
import { requireAdmin } from "@/lib/api-guard";
import { handleApiError } from "@/lib/api-error";
import { ok, fail } from "@/types";
import { hasServerEnv } from "@/env";
import { getPrefixSize } from "@/lib/oss";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/admin/games/[id]/refresh-size — 实时统计并更新某游戏的 OSS 占用 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!hasServerEnv()) {
    return NextResponse.json(
      fail("SERVER_NOT_CONFIGURED", "服务端环境变量未配置"),
      { status: 503 },
    );
  }
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await ctx.params;
  let existing;
  try {
    existing = await getAdminGame(id);
  } catch (err) {
    return handleApiError(`POST /api/admin/games/${id}/refresh-size · getAdminGame`, err);
  }
  if (!existing) {
    return NextResponse.json(fail("NOT_FOUND", "游戏不存在"), { status: 404 });
  }

  // iframe 模式无 OSS 占用
  if (existing.sourceType === "iframe" || !existing.ossPrefix) {
    return NextResponse.json(ok({ ossSize: 0 }));
  }

  let ossSize = 0;
  try {
    ossSize = await getPrefixSize(existing.ossPrefix);
  } catch (err) {
    console.error(`[API] POST /api/admin/games/${id}/refresh-size · OSS 统计失败`, {
      id,
      ossPrefix: existing.ossPrefix,
      err,
    });
    return NextResponse.json(
      fail("OSS_STAT_FAILED", `统计 OSS 失败: ${(err as Error).message}`),
      { status: 502 },
    );
  }

  try {
    await updateGame(id, { ossSize });
  } catch (err) {
    return handleApiError(`POST /api/admin/games/${id}/refresh-size · updateGame`, err);
  }
  return NextResponse.json(ok({ ossSize }));
}
