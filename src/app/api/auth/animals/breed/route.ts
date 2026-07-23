import { NextResponse } from "next/server";

import { requireUser } from "@/lib/user-session";
import { parseJson } from "@/lib/api-guard";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { breedAnimals } from "@/db/queries";
import { breedSchema } from "@/lib/validators";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/auth/animals/breed — 繁殖两只宠物，产下一枚蛋。 */
export async function POST(req: Request) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;

  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const input = breedSchema.parse(data);
    const result = await breedAnimals(guard.user.id, input.fatherId, input.motherId);

    if (!result.ok) {
      const messages: Record<typeof result.reason, string> = {
        same_pet: "不能与自身繁殖",
        not_owner: "宠物不属于当前用户",
        not_normal: "宠物状态不允许繁殖",
        cooldown: "宠物仍在冷却中",
        pet_not_found: "宠物不存在",
      };
      return NextResponse.json(
        fail("BREED_FAILED", messages[result.reason]),
        { status: 400 },
      );
    }

    return NextResponse.json(ok({ egg: result.egg }), { status: 201 });
  } catch (err) {
    if (isZodError(err)) {
      const issues = collectZodIssues(err);
      return NextResponse.json(
        fail("VALIDATION_ERROR", issues.length > 0 ? issues.join("; ") : "参数校验失败"),
        { status: 400 },
      );
    }
    return handleApiError("POST /api/auth/animals/breed", err);
  }
}
