import { NextResponse } from "next/server";

import {
  listAdminTags,
  createTag,
  recalcTagGameCount,
} from "@/db/queries";
import {
  taxonomyListQuerySchema,
  tagCreateSchema,
} from "@/lib/validators";
import { requireAdmin, parseJson } from "@/lib/api-guard";
import { createAuditLog } from "@/lib/audit-log";
import { handleApiError } from "@/lib/api-error";
import { ok, fail } from "@/types";
import { hasServerEnv } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const parsed = taxonomyListQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? 1,
    pageSize: url.searchParams.get("pageSize") ?? 10,
    search: url.searchParams.get("search") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "参数错误"),
      { status: 400 },
    );
  }

  try {
    const result = await listAdminTags({
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      search: parsed.data.search,
    });
    return NextResponse.json(ok(result));
  } catch (err) {
    return handleApiError("GET /api/admin/tags", err);
  }
}

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
    const input = tagCreateSchema.parse(data);
    const tag = await createTag({
      slug: input.slug,
      name: input.name,
      locale: input.locale,
      icon: input.icon,
      color: input.color,
      sortOrder: input.sortOrder,
      isVisible: input.isVisible,
    });

    try {
      await recalcTagGameCount(tag.id);
    } catch {}

    await createAuditLog({
      action: "tag.create",
      resource: "tag",
      targetId: tag.id,
      meta: { slug: input.slug, name: input.name },
    });

    return NextResponse.json(ok(tag), { status: 201 });
  } catch (err) {
    return handleApiError("POST /api/admin/tags", err);
  }
}
