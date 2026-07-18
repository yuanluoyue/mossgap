import { NextResponse } from "next/server";

import { requireUser } from "@/lib/user-session";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { parseJson } from "@/lib/api-guard";
import { updateUserProfile, getPublicUserById } from "@/db/queries";
import { userProfileUpdateSchema } from "@/lib/validators";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PUT /api/auth/profile — 当前 C 端用户更新自己的资料（name/locale）。 */
export async function PUT(req: Request) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;

  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const input = userProfileUpdateSchema.parse(data);
    await updateUserProfile(guard.user.id, {
      name: input.name ?? undefined,
      locale: input.locale ?? undefined,
    });
    const fresh = await getPublicUserById(guard.user.id);
    return NextResponse.json(ok({ user: fresh }));
  } catch (err) {
    if (isZodError(err)) {
      const issues = collectZodIssues(err);
      return NextResponse.json(
        fail("VALIDATION_ERROR", issues.length > 0 ? issues.join("; ") : "参数校验失败"),
        { status: 400 },
      );
    }
    return handleApiError("PUT /api/auth/profile", err);
  }
}
