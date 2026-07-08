import { NextResponse } from "next/server";

import { requireAdmin, parseJson } from "@/lib/api-guard";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { createAuditLog } from "@/lib/audit-log";
import { getAuthPayload } from "@/lib/auth";
import { updateAdmin, getAdminById } from "@/db/queries";
import { profileUpdateSchema, changePasswordSchema } from "@/lib/validators";
import { hashPassword, verifyPassword } from "@/lib/password";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PUT /api/admin/profile — 更新个人信息（昵称 + 邮箱） */
export async function PUT(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const me = await getAuthPayload();
  if (!me) {
    return NextResponse.json(fail("UNAUTHORIZED", "未登录或登录已过期"), {
      status: 401,
    });
  }

  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const input = profileUpdateSchema.parse(data);

    await updateAdmin(me.sub, {
      ...(input.name !== undefined ? { name: input.name ?? undefined } : {}),
      ...(input.email !== undefined ? { email: input.email ?? undefined } : {}),
    });

    await createAuditLog({
      action: "profile.update",
      resource: "profile",
      targetId: me.sub,
      meta: { name: input.name, email: input.email },
    });

    return NextResponse.json(ok({ id: me.sub }));
  } catch (err) {
    if (isZodError(err)) {
      const issues = collectZodIssues(err);
      return NextResponse.json(
        fail("VALIDATION_ERROR", issues.length > 0 ? issues.join("; ") : "参数校验失败"),
        { status: 400 },
      );
    }
    return handleApiError("PUT /api/admin/profile", err);
  }
}

/** POST /api/admin/profile — 修改密码 */
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const me = await getAuthPayload();
  if (!me) {
    return NextResponse.json(fail("UNAUTHORIZED", "未登录或登录已过期"), {
      status: 401,
    });
  }

  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const input = changePasswordSchema.parse(data);

    const admin = await getAdminById(me.sub);
    if (!admin) {
      return NextResponse.json(fail("NOT_FOUND", "账号不存在"), { status: 404 });
    }

    const valid = await verifyPassword(input.oldPassword, admin.passwordHash);
    if (!valid) {
      return NextResponse.json(
        fail("INVALID_PASSWORD", "原密码不正确"),
        { status: 400 },
      );
    }

    const newHash = await hashPassword(input.newPassword);
    await updateAdmin(me.sub, { passwordHash: newHash });

    await createAuditLog({
      action: "profile.change_password",
      resource: "profile",
      targetId: me.sub,
      meta: {},
    });

    return NextResponse.json(ok({ ok: true }));
  } catch (err) {
    if (isZodError(err)) {
      const issues = collectZodIssues(err);
      return NextResponse.json(
        fail("VALIDATION_ERROR", issues.length > 0 ? issues.join("; ") : "参数校验失败"),
        { status: 400 },
      );
    }
    return handleApiError("POST /api/admin/profile", err);
  }
}
