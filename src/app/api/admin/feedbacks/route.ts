import { NextResponse } from "next/server";

import {
  listAdminFeedbacks,
} from "@/db/queries";
import { listFeedbacksQuerySchema } from "@/lib/validators";
import {
  requireAdmin,
} from "@/lib/api-guard";
import { handleApiError } from "@/lib/api-error";
import { ok, fail } from "@/types";
import type { FeedbackStatus, FeedbackType } from "@/types";
import { hasServerEnv } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/feedbacks — 反馈列表（分页/筛选/搜索） */
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
  const parsed = listFeedbacksQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? 1,
    pageSize: url.searchParams.get("pageSize") ?? 10,
    type: url.searchParams.get("type") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "参数错误"),
      { status: 400 },
    );
  }

  try {
    const result = await listAdminFeedbacks({
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      type: parsed.data.type as FeedbackType | undefined,
      status: parsed.data.status as FeedbackStatus | undefined,
      search: parsed.data.search,
    });
    return NextResponse.json(ok(result));
  } catch (err) {
    return handleApiError("GET /api/admin/feedbacks", err);
  }
}
