import { NextResponse } from "next/server";

import {
  getAdminGame,
  getGameContent,
  getGameContentsByGameId,
  upsertGameContent,
  deleteGameContent,
} from "@/db/queries";
import { upsertGameContentSchema } from "@/lib/validators";
import { requireAdmin, parseJson } from "@/lib/api-guard";
import { createAuditLog } from "@/lib/audit-log";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { ok, fail } from "@/types";
import { hasServerEnv } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/games/[id]/content?locale=en
 * - 不传 locale：返回该游戏的全部 locale 内容数组（en + zh）
 * - 传 locale：返回单条；不存在时返回 null data
 */
export async function GET(
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
  const url = new URL(req.url);
  const locale = url.searchParams.get("locale") as "en" | "zh" | null;

  try {
    // 先确认游戏存在
    const game = await getAdminGame(id);
    if (!game) {
      return NextResponse.json(fail("NOT_FOUND", "游戏不存在"), { status: 404 });
    }

    if (locale === "en" || locale === "zh") {
      const content = await getGameContent(id, locale);
      return NextResponse.json(ok(content));
    }
    const list = await getGameContentsByGameId(id);
    return NextResponse.json(ok(list));
  } catch (err) {
    return handleApiError(`GET /api/admin/games/${id}/content`, err);
  }
}

/** PUT /api/admin/games/[id]/content — upsert 指定 locale 的内容 */
export async function PUT(
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
    const input = upsertGameContentSchema.parse(data);
    const saved = await upsertGameContent({
      gameId: id,
      locale: input.locale,
      summary: input.summary,
      howToPlay: input.howToPlay,
      tips: input.tips,
      controls: input.controls,
      faq: input.faq,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      keywords: input.keywords,
      canonical: input.canonical,
    });

    await createAuditLog({
      action: "game_content.upsert",
      resource: "game",
      targetId: id,
      meta: { locale: input.locale },
    });

    return NextResponse.json(ok(saved));
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
    return handleApiError(`PUT /api/admin/games/${id}/content`, err);
  }
}

/** DELETE /api/admin/games/[id]/content?locale=en — 删除指定 locale 的内容 */
export async function DELETE(
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
  const url = new URL(req.url);
  const locale = url.searchParams.get("locale") as "en" | "zh";
  if (locale !== "en" && locale !== "zh") {
    return NextResponse.json(
      fail("VALIDATION_ERROR", "locale 参数必须为 en 或 zh"),
      { status: 400 },
    );
  }

  try {
    await deleteGameContent(id, locale);
    await createAuditLog({
      action: "game_content.delete",
      resource: "game",
      targetId: id,
      meta: { locale },
    });
    return NextResponse.json(ok({}));
  } catch (err) {
    return handleApiError(`DELETE /api/admin/games/${id}/content`, err);
  }
}
