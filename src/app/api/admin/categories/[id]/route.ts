import { NextResponse } from "next/server";

import {
  getAdminCategory,
  updateCategory,
  deleteCategory,
  recalcCategoryGameCount,
} from "@/db/queries";
import { categoryUpdateSchema } from "@/lib/validators";
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
  let category;
  try {
    category = await getAdminCategory(id);
  } catch (err) {
    return handleApiError(`GET /api/admin/categories/${id} · getAdminCategory`, err);
  }
  if (!category) {
    return NextResponse.json(fail("NOT_FOUND", "分类不存在"), { status: 404 });
  }
  return NextResponse.json(ok(category));
}

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
  const existing = await getAdminCategory(id);
  if (!existing) {
    return NextResponse.json(fail("NOT_FOUND", "分类不存在"), { status: 404 });
  }

  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const input = categoryUpdateSchema.parse(data);
    const updated = await updateCategory(id, {
      slug: input.slug,
      name: input.name,
      locale: input.locale,
      icon: input.icon,
      coverImage: input.coverImage,
      color: input.color,
      sortOrder: input.sortOrder,
      isVisible: input.isVisible,
    });
    if (!updated) {
      return NextResponse.json(fail("NOT_FOUND", "分类不存在"), { status: 404 });
    }

    try {
      await recalcCategoryGameCount(id);
    } catch {}

    await createAuditLog({
      action: "category.update",
      resource: "category",
      targetId: id,
      meta: { slug: input.slug ?? existing.slug, name: input.name ?? existing.name },
    });

    return NextResponse.json(ok(updated));
  } catch (err) {
    return handleApiError(`PATCH /api/admin/categories/${id}`, err);
  }
}

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
    existing = await getAdminCategory(id);
  } catch (err) {
    return handleApiError(`DELETE /api/admin/categories/${id} · getAdminCategory`, err);
  }
  if (!existing) {
    return NextResponse.json(fail("NOT_FOUND", "分类不存在"), { status: 404 });
  }

  try {
    await deleteCategory(id);
  } catch (err) {
    return handleApiError(`DELETE /api/admin/categories/${id} · deleteCategory`, err);
  }

  try {
    await recalcCategoryGameCount(id);
  } catch {}

  await createAuditLog({
    action: "category.delete",
    resource: "category",
    targetId: id,
    meta: { slug: existing.slug, name: existing.name },
  });

  return NextResponse.json(ok({}));
}
