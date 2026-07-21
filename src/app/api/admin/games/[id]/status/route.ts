import { NextResponse } from "next/server";

import { getAdminGame, updateGame, recalcCategoryGameCount, recalcTagGameCount } from "@/db/queries";
import { updateGameStatusSchema } from "@/lib/validators";
import {
  requireAdmin,
  parseJson,
} from "@/lib/api-guard";
import { createAuditLog } from "@/lib/audit-log";
import { handleApiError } from "@/lib/api-error";
import { ok, fail } from "@/types";
import { hasServerEnv } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/games/[id]/status — 上下架快捷操作
 *
 * 仅更新 status 字段，不依赖完整表单校验。
 * 上架/下架属于敏感操作，必须记操作日志。
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await hasServerEnv())) {
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
    return handleApiError(`PATCH /api/admin/games/${id}/status · getAdminGame`, err);
  }
  if (!existing) {
    return NextResponse.json(fail("NOT_FOUND", "游戏不存在"), { status: 404 });
  }

  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  let input;
  try {
    input = updateGameStatusSchema.parse(data);
  } catch (err) {
    return handleApiError(`PATCH /api/admin/games/${id}/status · parse`, err);
  }

  // 状态未变化直接返回
  if (existing.status === input.status) {
    return NextResponse.json(ok({ status: existing.status }));
  }

  let updated;
  try {
    updated = await updateGame(id, {
      status: input.status as "draft" | "published" | "archived",
    });
  } catch (err) {
    return handleApiError(`PATCH /api/admin/games/${id}/status · updateGame`, err);
  }
  if (!updated) {
    return NextResponse.json(fail("NOT_FOUND", "游戏不存在"), { status: 404 });
  }

  // 敏感操作留痕
  await createAuditLog({
    action: "game.status_change",
    resource: "game",
    targetId: id,
    meta: { from: existing.status, to: input.status, slug: existing.slug },
  });

  // 重算分类/标签游戏数（gameCount 只统计 published）
  if (updated.categoryId) {
    await recalcCategoryGameCount(updated.categoryId);
  }
  for (const tagId of updated.tagIds ?? []) {
    await recalcTagGameCount(tagId);
  }

  return NextResponse.json(ok({ status: updated.status }));
}
