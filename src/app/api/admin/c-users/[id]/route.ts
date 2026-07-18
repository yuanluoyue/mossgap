import { NextResponse } from "next/server";

import { requireAdmin, parseJson } from "@/lib/api-guard";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { createAuditLog } from "@/lib/audit-log";
import {
  getAdminCUser,
  adminUpdateCUser,
  deleteCUser,
} from "@/db/queries";
import { cUserUpdateSchema } from "@/lib/validators";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/c-users/[id] — 获取 C 端用户详情。 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await ctx.params;
  const user = await getAdminCUser(id);
  if (!user) {
    return NextResponse.json(fail("NOT_FOUND", "用户不存在"), { status: 404 });
  }
  return NextResponse.json(ok({ user }));
}

/** PUT /api/admin/c-users/[id] — 更新 C 端用户（name/isActive/locale）。 */
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await ctx.params;
  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const input = cUserUpdateSchema.parse(data);
    const before = await getAdminCUser(id);
    if (!before) {
      return NextResponse.json(fail("NOT_FOUND", "用户不存在"), { status: 404 });
    }

    await adminUpdateCUser(id, {
      name: input.name ?? undefined,
      isActive: input.isActive,
      locale: input.locale,
    });

    await createAuditLog({
      action: "c-user.update",
      resource: "c-users",
      targetId: id,
      meta: {
        before: {
          name: before.name,
          isActive: before.isActive,
          locale: before.locale,
        },
        after: {
          name: input.name ?? before.name,
          isActive: input.isActive ?? before.isActive,
          locale: input.locale ?? before.locale,
        },
      },
    });

    const fresh = await getAdminCUser(id);
    return NextResponse.json(ok({ user: fresh }));
  } catch (err) {
    if (isZodError(err)) {
      const issues = collectZodIssues(err);
      return NextResponse.json(
        fail("VALIDATION_ERROR", issues.length > 0 ? issues.join("; ") : "参数校验失败"),
        { status: 400 },
      );
    }
    return handleApiError("PUT /api/admin/c-users/[id]", err);
  }
}

/** DELETE /api/admin/c-users/[id] — 删除 C 端用户（级联删除 authAccounts / sessions）。 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await ctx.params;
  const before = await getAdminCUser(id);
  if (!before) {
    return NextResponse.json(fail("NOT_FOUND", "用户不存在"), { status: 404 });
  }

  await deleteCUser(id);

  await createAuditLog({
    action: "c-user.delete",
    resource: "c-users",
    targetId: id,
    meta: {
      email: before.email,
      name: before.name,
      providers: before.providers,
    },
  });

  return NextResponse.json(ok({}));
}
