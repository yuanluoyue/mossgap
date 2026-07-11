import { NextResponse } from "next/server";

import {
  listAdminCategories,
  createCategory,
  recalcCategoryGameCount,
} from "@/db/queries";
import {
  taxonomyListQuerySchema,
  categoryCreateSchema,
} from "@/lib/validators";
import { requireAdmin, parseJson } from "@/lib/api-guard";
import { createAuditLog } from "@/lib/audit-log";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
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
    const result = await listAdminCategories({
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      search: parsed.data.search,
    });
    return NextResponse.json(ok(result));
  } catch (err) {
    return handleApiError("GET /api/admin/categories", err);
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
    const input = categoryCreateSchema.parse(data);
    const category = await createCategory({
      slug: input.slug,
      name: input.name,
      locale: input.locale,
      icon: input.icon,
      coverImage: input.coverImage,
      color: input.color,
      sortOrder: input.sortOrder,
      isVisible: input.isVisible,
    });

    try {
      await recalcCategoryGameCount(category.id);
    } catch {}

    await createAuditLog({
      action: "category.create",
      resource: "category",
      targetId: category.id,
      meta: { slug: input.slug, name: input.name },
    });

    return NextResponse.json(ok(category), { status: 201 });
  } catch (err) {
    if (isZodError(err)) {
      const issues = collectZodIssues(err);
      console.error("[API] POST /api/admin/categories · 校验失败", {
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
    return handleApiError("POST /api/admin/categories", err);
  }
}
