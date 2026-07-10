import { NextResponse } from "next/server";

import { createFeedback } from "@/db/queries";
import { createFeedbackSchema } from "@/lib/validators";
import { getClientIp, getClientUserAgent, parseJson } from "@/lib/api-guard";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { ok, fail } from "@/types";
import type { FeedbackType } from "@/types";
import { hasServerEnv } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/feedback — 用户提交反馈（游戏反馈 / 平台反馈） */
export async function POST(req: Request) {
  if (!(await hasServerEnv())) {
    return NextResponse.json(
      fail("SERVER_NOT_CONFIGURED", "服务端环境变量未配置"),
      { status: 503 },
    );
  }

  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const input = createFeedbackSchema.parse(data);
    const [ip, ua] = await Promise.all([getClientIp(), getClientUserAgent()]);
    await createFeedback({
      type: input.type as FeedbackType,
      gameId: input.gameId || undefined,
      contact: input.contact || undefined,
      content: input.content,
      userIp: ip,
      userAgent: ua,
    });
    return NextResponse.json(ok({}), { status: 201 });
  } catch (err) {
    if (isZodError(err)) {
      const issues = collectZodIssues(err);
      return NextResponse.json(
        fail(
          "VALIDATION_ERROR",
          issues.length > 0 ? issues.join("; ") : "参数校验失败",
        ),
        { status: 400 },
      );
    }
    return handleApiError("POST /api/feedback", err);
  }
}
