import { NextResponse } from "next/server";

import { getPublicGameBySlug, toggleLike, hasLiked } from "@/db/queries";
import { getClientIp } from "@/lib/api-guard";
import { handleApiError } from "@/lib/api-error";
import { ok, fail } from "@/types";
import { hasServerEnv } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/games/[slug]/like — 查询当前 IP 是否已点赞及点赞数 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  if (!hasServerEnv()) {
    return NextResponse.json(
      fail("SERVER_NOT_CONFIGURED", "服务端环境变量未配置"),
      { status: 503 },
    );
  }
  const { slug } = await ctx.params;
  const ip = await getClientIp();
  let game;
  try {
    game = await getPublicGameBySlug(slug, "en");
  } catch (err) {
    return handleApiError(`GET /api/games/${slug}/like · getPublicGameBySlug`, err);
  }
  if (!game) {
    return NextResponse.json(fail("NOT_FOUND", "游戏不存在"), { status: 404 });
  }
  try {
    const liked = await hasLiked(game.id, ip);
    return NextResponse.json(ok({ liked, likeCount: game.likeCount }));
  } catch (err) {
    return handleApiError(`GET /api/games/${slug}/like · hasLiked`, err);
  }
}

/** POST /api/games/[slug]/like — 切换点赞状态（已点赞则取消） */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  if (!hasServerEnv()) {
    return NextResponse.json(
      fail("SERVER_NOT_CONFIGURED", "服务端环境变量未配置"),
      { status: 503 },
    );
  }
  const { slug } = await ctx.params;
  const ip = await getClientIp();
  let game;
  try {
    game = await getPublicGameBySlug(slug, "en");
  } catch (err) {
    return handleApiError(`POST /api/games/${slug}/like · getPublicGameBySlug`, err);
  }
  if (!game) {
    return NextResponse.json(fail("NOT_FOUND", "游戏不存在"), { status: 404 });
  }
  try {
    const result = await toggleLike(game.id, ip);
    return NextResponse.json(ok(result));
  } catch (err) {
    return handleApiError(`POST /api/games/${slug}/like · toggleLike`, err);
  }
}
