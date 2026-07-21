import { NextResponse } from "next/server";

import {
  getAdminCollection,
  updateCollection,
  deleteCollection,
} from "@/db/queries";
import { collectionUpdateSchema } from "@/lib/validators";
import {
  requireAdmin,
  parseJson,
} from "@/lib/api-guard";
import { createAuditLog } from "@/lib/audit-log";
import { handleApiError } from "@/lib/api-error";
import { ok, fail, type CollectionLayout } from "@/types";
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
  let collection;
  try {
    collection = await getAdminCollection(id);
  } catch (err) {
    return handleApiError(`GET /api/admin/collections/${id} · getAdminCollection`, err);
  }
  if (!collection) {
    return NextResponse.json(fail("NOT_FOUND", "专题不存在"), { status: 404 });
  }
  return NextResponse.json(ok(collection));
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
  const existing = await getAdminCollection(id);
  if (!existing) {
    return NextResponse.json(fail("NOT_FOUND", "专题不存在"), { status: 404 });
  }

  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const input = collectionUpdateSchema.parse(data);
    const updated = await updateCollection(id, {
      slug: input.slug,
      name: input.name,
      locale: input.locale,
      icon: input.icon,
      coverImage: input.coverImage,
      layout: input.layout as CollectionLayout,
      sortOrder: input.sortOrder,
      isVisible: input.isVisible,
    });
    if (!updated) {
      return NextResponse.json(fail("NOT_FOUND", "专题不存在"), { status: 404 });
    }

    await createAuditLog({
      action: "collection.update",
      resource: "collection",
      targetId: id,
      meta: { slug: input.slug ?? existing.slug, name: input.name ?? existing.name },
    });

    return NextResponse.json(ok(updated));
  } catch (err) {
    return handleApiError(`PATCH /api/admin/collections/${id}`, err);
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
    existing = await getAdminCollection(id);
  } catch (err) {
    return handleApiError(`DELETE /api/admin/collections/${id} · getAdminCollection`, err);
  }
  if (!existing) {
    return NextResponse.json(fail("NOT_FOUND", "专题不存在"), { status: 404 });
  }

  try {
    await deleteCollection(id);
  } catch (err) {
    return handleApiError(`DELETE /api/admin/collections/${id} · deleteCollection`, err);
  }

  await createAuditLog({
    action: "collection.delete",
    resource: "collection",
    targetId: id,
    meta: { slug: existing.slug, name: existing.name },
  });

  return NextResponse.json(ok({}));
}
