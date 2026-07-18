import { NextResponse } from "next/server";

import { listAdminGames, createGame } from "@/db/queries";
import {
  listGamesQuerySchema,
  createIframeGameSchema,
} from "@/lib/validators";
import { requireAdmin, parseJson } from "@/lib/api-guard";
import { getAuthPayload } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit-log";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { ok, fail } from "@/types";
import { hasServerEnv } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/games — 游戏列表（分页/搜索/状态筛选） */
export async function GET(req: Request) {
  if (!(await hasServerEnv())) {
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

  try {
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
  } catch (err) {
    return handleApiError("GET /api/admin/games", err);
  }
}

/** POST /api/admin/games — 创建游戏（支持 iframe 外链模式） */
export async function POST(req: Request) {
  if (!(await hasServerEnv())) {
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
    const input = createIframeGameSchema.parse(data);
    const authPayload = await getAuthPayload();
    const game = await createGame({
      slug: input.slug,
      title: input.title,
      description: "",
      coverImage: input.coverImage,
      screenshots: [],
      entryFile: "index.html",
      ossPrefix: "", // iframe 模式无 OSS 资源
      status: "draft",
      locale: {
        en: { title: input.title, description: "" },
        zh: { title: input.title, description: "" },
      },
      sourceType: "iframe",
      iframeUrl: input.iframeUrl,
      ossSize: 0,
      uploaderId: authPayload?.sub ?? null,
    });

    await createAuditLog({
      action: "game.create.iframe",
      resource: "game",
      targetId: game.id,
      meta: { slug: input.slug, iframeUrl: input.iframeUrl },
    });

    return NextResponse.json(ok(game), { status: 201 });
  } catch (err) {
    if (isZodError(err)) {
      const issues = collectZodIssues(err);
      console.error("[API] POST /api/admin/games · 校验失败", {
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
    return handleApiError("POST /api/admin/games", err);
  }
}
