import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { cleanupOldUserMissions } from "@/db/queries";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/cron/cleanup-missions
 *
 * 清理 180 天前的 user_missions 记录。
 *
 * 触发方式（任选其一）：
 * 1. 外部 cron 服务（如 cron-job.org / GitHub Actions）定时 POST 此端点
 * 2. 单独的 Cloudflare Worker（带 scheduled handler）调用此端点
 * 3. 手动 curl 调用，便于一次性运维清理
 *
 * 鉴权：请求头 `X-Cron-Secret: <CRON_SECRET>`。
 * CRON_SECRET 通过 `wrangler secret put CRON_SECRET` 配置。
 *
 * 注：OpenNext Cloudflare worker 模板仅导出 `fetch`，没有 `scheduled` handler，
 * 因此无法直接在主 worker 上使用 wrangler `[triggers] crons`。
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      fail("NOT_CONFIGURED", "未配置 CRON_SECRET，无法执行定时清理"),
      { status: 503 },
    );
  }
  const provided = req.headers.get("x-cron-secret");
  if (provided !== secret) {
    return NextResponse.json(
      fail("UNAUTHORIZED", "鉴权失败"),
      { status: 401 },
    );
  }

  try {
    const result = await cleanupOldUserMissions(180);
    console.info(
      `[cron] cleanup-missions deleted ${result.deleted} rows at ${new Date().toISOString()}`,
    );
    return NextResponse.json(ok(result));
  } catch (err) {
    return handleApiError("POST /api/cron/cleanup-missions", err);
  }
}
