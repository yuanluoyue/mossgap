import { NextResponse } from "next/server";

import { requireUser } from "@/lib/user-session";
import { handleApiError } from "@/lib/api-error";
import { hatchEgg } from "@/db/queries";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/auth/eggs/[id]/hatch — 孵化蛋（手动打开）。 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;

  try {
    const { id } = await params;
    const result = await hatchEgg(guard.user.id, id);

    if (!result.ok) {
      const messages: Record<typeof result.reason, string> = {
        egg_not_found: "蛋不存在",
        not_owner: "蛋不属于当前用户",
        not_ready: "蛋还未孵化完成",
        already_hatched: "蛋已经孵化过了",
      };
      return NextResponse.json(
        fail("HATCH_FAILED", messages[result.reason]),
        { status: 400 },
      );
    }

    return NextResponse.json(ok({ pet: result.pet }), { status: 201 });
  } catch (err) {
    return handleApiError("POST /api/auth/eggs/[id]/hatch", err);
  }
}
