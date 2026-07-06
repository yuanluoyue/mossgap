import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAdminGame, updateGame, deleteGame } from "@/db/queries";
import { upsertGameSchema } from "@/lib/validators";
import { requireAdmin, parseJson } from "@/lib/api-guard";
import { ok, fail } from "@/types";
import { hasServerEnv } from "@/env";
import { deletePrefix } from "@/lib/oss";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/games/[id] — 获取单个游戏详情 */
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
  const game = await getAdminGame(id);
  if (!game) {
    return NextResponse.json(fail("NOT_FOUND", "游戏不存在"), { status: 404 });
  }
  return NextResponse.json(ok(game));
}

/** PATCH /api/admin/games/[id] — 更新游戏配置 */
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
    });
    if (!updated) {
      return NextResponse.json(fail("NOT_FOUND", "游戏不存在"), { status: 404 });
    }
    return NextResponse.json(ok(updated));
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        fail("VALIDATION_ERROR", err.issues[0]?.message ?? "参数错误"),
        { status: 400 },
      );
    }
    return NextResponse.json(fail("INTERNAL", "更新失败"), { status: 500 });
  }
}

/** DELETE /api/admin/games/[id] — 删除游戏（同时清理 R2 资源） */
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
  const existing = await getAdminGame(id);
  if (!existing) {
    return NextResponse.json(fail("NOT_FOUND", "游戏不存在"), { status: 404 });
  }

  // 先清理 R2 资源（如有），再删除数据库记录
  if (existing.ossPrefix) {
    try {
      await deletePrefix(existing.ossPrefix);
    } catch {
      // R2 清理失败不阻塞删除，记录仍在数据库中
    }
  }
  await deleteGame(id);
  return NextResponse.json(ok({}));
}
