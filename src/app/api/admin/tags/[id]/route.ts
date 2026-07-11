import { NextResponse } from "next/server";

import {
  getAdminTag,
  updateTag,
  deleteTag,
  recalcTagGameCount,
} from "@/db/queries";
import { tagUpdateSchema } from "@/lib/validators";
import {
  requireAdmin,
  parseJson,
} from "@/lib/api-guard";
import { createAuditLog } from "@/lib/audit-log";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
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
  let tag;
  try {
    tag = await getAdminTag(id);
  } catch (err) {
    return handleApiError(`GET /api/admin/tags/${id} · getAdminTag`, err);
  }
  if (!tag) {
    return NextResponse.json(fail("NOT_FOUND", "标签不存在"), { status: 404 });
  }
  return NextResponse.json(ok(tag));
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
  const existing = await getAdminTag(id);
  if (!existing) {
    return NextResponse.json(fail("NOT_FOUND", "标签不存在"), { status: 404 });
  }

  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const input = tagUpdateSchema.parse(data);
    const updated = await updateTag(id, {
      slug: input.slug,
      name: input.name,
      locale: input.locale,
      icon: input.icon,
      color: input.color,
      sortOrder: input.sortOrder,
      isVisible: input.isVisible,
    });
    if (!updated) {
      return NextResponse.json(fail("NOT_FOUND", "标签不存在"), { status: 404 });
    }

    try {
      await recalcTagGameCount(id);
    } catch {}

    await createAuditLog({
      action: "tag.update",
      resource: "tag",
      targetId: id,
      meta: { slug: input.slug ?? existing.slug, name: input.name ?? existing.name },
    });

    return NextResponse.json(ok(updated));
  } catch (err) {
    if (isZodError(err)) {
      const issues = collectZodIssues(err);
      console.error(`[API] PATCH /api/admin/tags/${id} · 校验失败`, {
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
    return handleApiError(`PATCH /api/admin/tags/${id}`, err);
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
    existing = await getAdminTag(id);
  } catch (err) {
    return handleApiError(`DELETE /api/admin/tags/${id} · getAdminTag`, err);
  }
  if (!existing) {
    return NextResponse.json(fail("NOT_FOUND", "标签不存在"), { status: 404 });
  }

  try {
    await deleteTag(id);
  } catch (err) {
    return handleApiError(`DELETE /api/admin/tags/${id} · deleteTag`, err);
  }

  try {
    await recalcTagGameCount(id);
  } catch {}

  await createAuditLog({
    action: "tag.delete",
    resource: "tag",
    targetId: id,
    meta: { slug: existing.slug, name: existing.name },
  });

  return NextResponse.json(ok({}));
}
