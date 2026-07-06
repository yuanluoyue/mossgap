import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { listAdminGames, createGame } from "@/db/queries";
import { listGamesQuerySchema, upsertGameSchema } from "@/lib/validators";
import { requireAdmin, parseJson } from "@/lib/api-guard";
import { ok, fail } from "@/types";
import { hasServerEnv } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/games — 游戏列表（分页/搜索/状态筛选） */
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
  const parsed = listGamesQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? 1,
    pageSize: url.searchParams.get("pageSize") ?? 20,
    search: url.searchParams.get("search") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "参数错误"),
      { status: 400 },
    );
  }

  const result = await listAdminGames({
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
    search: parsed.data.search,
    status: parsed.data.status as
      | "draft"
      | "published"
      | "archived"
      | undefined,
  });
  return NextResponse.json(ok(result));
}

/** POST /api/admin/games — 手动创建游戏（不带上传） */
export async function POST(req: Request) {
  if (!hasServerEnv()) {
    return NextResponse.json(
      fail("SERVER_NOT_CONFIGURED", "服务端环境变量未配置"),
      { status: 503 },
    );
  }
  const guard = await requireAdmin();
  if (guard) return guard;

  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const input = upsertGameSchema.parse(data);
    const game = await createGame({
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
      ossPrefix: "", // 手动创建时无 OSS 资源
      status: input.status as "draft" | "published" | "archived",
      locale: input.locale,
    });
    return NextResponse.json(ok(game), { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        fail("VALIDATION_ERROR", err.issues[0]?.message ?? "参数错误"),
        { status: 400 },
      );
    }
    return NextResponse.json(fail("INTERNAL", "创建失败"), { status: 500 });
  }
}
