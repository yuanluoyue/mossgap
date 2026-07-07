import { NextResponse } from "next/server";

import { getOssUsageStats } from "@/db/queries";
import { requireAdmin } from "@/lib/api-guard";
import { handleApiError } from "@/lib/api-error";
import { ok, fail } from "@/types";
import { hasServerEnv } from "@/env";
import { getBucketSize } from "@/lib/oss";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/oss-usage
 * - 默认返回数据库缓存的 ossSize 统计（快）
 * - ?live=1 时实时统计整个 bucket 实际占用（慢，遍历 OSS）
 */
export async function GET(req: Request) {
  if (!hasServerEnv()) {
    return NextResponse.json(
      fail("SERVER_NOT_CONFIGURED", "服务端环境变量未配置"),
      { status: 503 },
    );
  }
  const guard = await requireAdmin();
  if (guard) return guard;

  const url = new URL(req.url);
  const live = url.searchParams.get("live") === "1";

  let stats;
  try {
    stats = await getOssUsageStats();
  } catch (err) {
    return handleApiError("GET /api/admin/oss-usage · getOssUsageStats", err);
  }

  if (!live) {
    return NextResponse.json(
      ok({
        total: stats.total,
        perGame: stats.perGame,
        live: false,
      }),
    );
  }

  // 实时统计 bucket 实际占用
  let liveTotal = 0;
  try {
    liveTotal = await getBucketSize();
  } catch (err) {
    console.error("[API] GET /api/admin/oss-usage · getBucketSize 失败", err);
    return NextResponse.json(
      fail(
        "OSS_STAT_FAILED",
        `实时统计 OSS 失败: ${(err as Error).message}`,
      ),
      { status: 502 },
    );
  }

  return NextResponse.json(
    ok({
      total: stats.total,
      liveTotal,
      perGame: stats.perGame,
      live: true,
    }),
  );
}
