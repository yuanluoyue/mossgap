import { NextResponse } from "next/server";

import {
  getAdminFeedback,
  updateFeedbackStatus,
  deleteFeedback,
  writeOperationLog,
} from "@/db/queries";
import { updateFeedbackStatusSchema } from "@/lib/validators";
import {
  requireAdmin,
  parseJson,
  getClientIp,
  getClientUserAgent,
} from "@/lib/api-guard";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { ok, fail } from "@/types";
import type { FeedbackStatus } from "@/types";
import { hasServerEnv } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/feedbacks/[id] — 获取单个反馈详情 */
export async function GET(
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
  try {
    const feedback = await getAdminFeedback(id);
    if (!feedback) {
      return NextResponse.json(fail("NOT_FOUND", "反馈不存在"), { status: 404 });
    }
    return NextResponse.json(ok(feedback));
  } catch (err) {
    return handleApiError(`GET /api/admin/feedbacks/${id}`, err);
  }
}

/** PATCH /api/admin/feedbacks/[id] — 更新反馈状态 */
export async function PATCH(
  req: Request,
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
  const existing = await getAdminFeedback(id);
  if (!existing) {
    return NextResponse.json(fail("NOT_FOUND", "反馈不存在"), { status: 404 });
  }

  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const input = updateFeedbackStatusSchema.parse(data);
    const updated = await updateFeedbackStatus(id, input.status as FeedbackStatus);
    if (!updated) {
      return NextResponse.json(fail("NOT_FOUND", "反馈不存在"), { status: 404 });
    }

    try {
      const [ip, ua] = await Promise.all([getClientIp(), getClientUserAgent()]);
      await writeOperationLog({
        action: "feedback.status_change",
        targetType: "feedback",
        targetId: id,
        meta: { from: existing.status, to: input.status },
        operatorIp: ip,
        operatorUseragent: ua,
      });
    } catch {
      // 日志失败不阻塞
    }

    return NextResponse.json(ok(updated));
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
    return handleApiError(`PATCH /api/admin/feedbacks/${id}`, err);
  }
}

/** DELETE /api/admin/feedbacks/[id] — 删除单个反馈 */
export async function DELETE(
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
  const existing = await getAdminFeedback(id);
  if (!existing) {
    return NextResponse.json(fail("NOT_FOUND", "反馈不存在"), { status: 404 });
  }

  try {
    await deleteFeedback(id);
  } catch (err) {
    return handleApiError(`DELETE /api/admin/feedbacks/${id} · deleteFeedback`, err);
  }

  try {
    const [ip, ua] = await Promise.all([getClientIp(), getClientUserAgent()]);
    await writeOperationLog({
      action: "feedback.delete",
      targetType: "feedback",
      targetId: id,
      meta: { type: existing.type, contentPreview: existing.content.slice(0, 100) },
      operatorIp: ip,
      operatorUseragent: ua,
    });
  } catch {
    // 日志失败不阻塞
  }

  return NextResponse.json(ok({}));
}
