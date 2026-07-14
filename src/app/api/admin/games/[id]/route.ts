import { NextResponse } from "next/server";

import {
  getAdminGame,
  updateGame,
  deleteGame,
  recalcCategoryGameCount,
  recalcTagGameCount,
} from "@/db/queries";
import { upsertGameSchema } from "@/lib/validators";
import {
  requireAdmin,
  parseJson,
} from "@/lib/api-guard";
import { createAuditLog } from "@/lib/audit-log";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { ok, fail } from "@/types";
import { hasServerEnv } from "@/env";
import { deletePrefix, deleteObject, extractKeyFromUrl } from "@/lib/oss";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/games/[id] — 获取单个游戏详情 */
export async function GET(
  _req: Request,
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
  let game;
  try {
    game = await getAdminGame(id);
  } catch (err) {
    return handleApiError(`GET /api/admin/games/${id} · getAdminGame`, err);
  }
  if (!game) {
    return NextResponse.json(fail("NOT_FOUND", "游戏不存在"), { status: 404 });
  }
  return NextResponse.json(ok(game));
}

/** PATCH /api/admin/games/[id] — 更新游戏配置（含上架/下架状态切换） */
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
  const existing = await getAdminGame(id);
  if (!existing) {
    return NextResponse.json(fail("NOT_FOUND", "游戏不存在"), { status: 404 });
  }

  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const input = upsertGameSchema.parse(data);
    const updated = await updateGame(id, {
      slug: input.slug,
      title: input.locale.en.title || input.locale.zh.title || input.slug,
      description: input.locale.en.description,
      category: input.category as
        | "action"
        | "puzzle"
        | "arcade"
        | "adventure"
        | "strategy"
        | "sports"
        | "racing"
        | "other",
      coverImage: input.coverImage,
      screenshots: input.screenshots,
      entryFile: input.entryFile,
      status: input.status as "draft" | "published" | "archived",
      locale: input.locale,
      sourceType: input.sourceType as "zip" | "iframe",
      iframeUrl: input.iframeUrl,
      howToPlay: input.howToPlay,
      relatedGameIds: input.relatedGameIds,
      internalNotes: input.internalNotes,
      categoryId: input.categoryId ?? null,
      tagIds: input.tagIds,
      collectionIds: input.collectionIds,
    });
    if (!updated) {
      return NextResponse.json(fail("NOT_FOUND", "游戏不存在"), { status: 404 });
    }

    // 重算分类游戏数：categoryId 变化时重算新旧分类；status 变化时重算当前分类
    const oldCatId = existing.categoryId ?? null;
    const newCatId = updated.categoryId ?? null;
    const catChanged = oldCatId !== newCatId;
    const statusChanged = existing.status !== updated.status;
    if (catChanged) {
      if (oldCatId) await recalcCategoryGameCount(oldCatId);
      if (newCatId) await recalcCategoryGameCount(newCatId);
    } else if (statusChanged && newCatId) {
      await recalcCategoryGameCount(newCatId);
    }

    // 重算标签游戏数：tagIds 变化时重算受影响的标签
    const oldTagIds = new Set(existing.tagIds ?? []);
    const newTagIds = new Set(updated.tagIds ?? []);
    if (catChanged || statusChanged || oldTagIds.size !== newTagIds.size || [...oldTagIds].some((t) => !newTagIds.has(t))) {
      const affectedTags = new Set<string>([...oldTagIds, ...newTagIds]);
      for (const tagId of affectedTags) {
        await recalcTagGameCount(tagId);
      }
    }

    // 状态变更记日志（上架/下架属于敏感操作）
    if (existing.status !== updated.status) {
      await createAuditLog({
        action: "game.status_change",
        resource: "game",
        targetId: id,
        meta: { from: existing.status, to: updated.status },
      });
    } else {
      // 普通编辑
      await createAuditLog({
        action: "game.update",
        resource: "game",
        targetId: id,
        meta: { slug: input.slug },
      });
    }

    return NextResponse.json(ok(updated));
  } catch (err) {
    if (isZodError(err)) {
      const issues = collectZodIssues(err);
      console.error(`[API] PATCH /api/admin/games/${id} · 校验失败`, {
        id,
        issues,
        raw: (err as { issues?: unknown }).issues,
      });
      return NextResponse.json(
        fail(
          "VALIDATION_ERROR",
          issues.length > 0 ? issues.join("; ") : "参数校验失败",
        ),
        { status: 400 },
      );
    }
    return handleApiError(`PATCH /api/admin/games/${id}`, err);
  }
}

/** DELETE /api/admin/games/[id] — 删除游戏（同时清理 OSS 资源） */
export async function DELETE(
  _req: Request,
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
    return handleApiError(`DELETE /api/admin/games/${id} · getAdminGame`, err);
  }
  if (!existing) {
    return NextResponse.json(fail("NOT_FOUND", "游戏不存在"), { status: 404 });
  }

  // 先清理 OSS 资源（zip 游戏目录 + 封面图 + 截图），再删除数据库记录
  const imageUrls = [existing.coverImage, ...existing.screenshots].filter(
    (u): u is string => !!u && u.length > 0,
  );
  if (existing.sourceType === "zip" && existing.ossPrefix) {
    try {
      await deletePrefix(existing.ossPrefix);
    } catch (err) {
      // OSS 清理失败不阻塞删除，记录仍在数据库中
      console.error(`[API] DELETE /api/admin/games/${id} · OSS 清理失败`, {
        id,
        ossPrefix: existing.ossPrefix,
        err,
      });
    }
  }
  // 清理封面图和截图（属于 images/ 前缀，不在游戏目录内）
  for (const imgUrl of imageUrls) {
    const key = await extractKeyFromUrl(imgUrl);
    if (!key) continue;
    try {
      await deleteObject(key);
    } catch {
      // 单张图片删除失败不阻塞
    }
  }
  try {
    await deleteGame(id);
  } catch (err) {
    return handleApiError(`DELETE /api/admin/games/${id} · deleteGame`, err);
  }

  await createAuditLog({
    action: "game.delete",
    resource: "game",
    targetId: id,
    meta: { slug: existing.slug, title: existing.title },
  });

  return NextResponse.json(ok({}));
}
