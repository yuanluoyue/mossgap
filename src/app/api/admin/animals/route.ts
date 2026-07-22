import { NextResponse } from "next/server";

import { requireAdmin, parseJson } from "@/lib/api-guard";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { createAuditLog } from "@/lib/audit-log";
import { createAnimal, listAllAnimals } from "@/db/queries";
import { listAnimalsQuerySchema, animalCreateSchema } from "@/lib/validators";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/animals — 宠物列表（分页 + 搜索 + 过滤）。 */
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const url = new URL(req.url);
    const sp = Object.fromEntries(url.searchParams.entries());
    const input = listAnimalsQuerySchema.parse(sp);

    const result = await listAllAnimals({
      page: input.page,
      pageSize: input.pageSize,
      search: input.search,
      speciesId: input.speciesId,
      status: input.status,
      ownerId: input.ownerId,
    });

    return NextResponse.json(ok(result));
  } catch (err) {
    if (isZodError(err)) {
      const issues = collectZodIssues(err);
      return NextResponse.json(
        fail("VALIDATION_ERROR", issues.length > 0 ? issues.join("; ") : "参数校验失败"),
        { status: 400 },
      );
    }
    return handleApiError("GET /api/admin/animals", err);
  }
}

/** POST /api/admin/animals — 创建宠物（手动发放或测试用）。 */
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const input = animalCreateSchema.parse(data);

    const pet = await createAnimal({
      ownerId: input.ownerId,
      speciesId: input.speciesId,
      genome: input.genome,
      generation: input.generation,
      fatherId: input.fatherId ?? null,
      motherId: input.motherId ?? null,
      breedCount: input.breedCount,
      cooldownAt: input.cooldownAt,
      status: input.status,
    });

    await createAuditLog({
      action: "animal.create",
      resource: "animals",
      targetId: pet.id,
      meta: {
        ownerId: pet.ownerId,
        speciesId: pet.speciesId,
        generation: pet.generation,
        status: pet.status,
      },
    });

    return NextResponse.json(ok({ pet }), { status: 201 });
  } catch (err) {
    if (isZodError(err)) {
      const issues = collectZodIssues(err);
      return NextResponse.json(
        fail("VALIDATION_ERROR", issues.length > 0 ? issues.join("; ") : "参数校验失败"),
        { status: 400 },
      );
    }
    return handleApiError("POST /api/admin/animals", err);
  }
}
