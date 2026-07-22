import { NextResponse } from "next/server";

import { requireAdmin, parseJson } from "@/lib/api-guard";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { createAuditLog } from "@/lib/audit-log";
import { deleteAnimal, getAdminAnimalById, updateAnimal } from "@/db/queries";
import { animalUpdateSchema } from "@/lib/validators";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/animals/[id] — 宠物详情。 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await ctx.params;
  const pet = await getAdminAnimalById(id);
  if (!pet) {
    return NextResponse.json(fail("NOT_FOUND", "宠物不存在"), { status: 404 });
  }
  return NextResponse.json(ok({ pet }));
}

/** PUT /api/admin/animals/[id] — 更新宠物。 */
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
    const input = animalUpdateSchema.parse(data);
    const before = await getAdminAnimalById(id);
    if (!before) {
      return NextResponse.json(fail("NOT_FOUND", "宠物不存在"), { status: 404 });
    }

    const pet = await updateAnimal(id, {
      speciesId: input.speciesId,
      genome: input.genome,
      generation: input.generation,
      fatherId: input.fatherId,
      motherId: input.motherId,
      breedCount: input.breedCount,
      cooldownAt: input.cooldownAt,
      status: input.status,
    });

    await createAuditLog({
      action: "animal.update",
      resource: "animals",
      targetId: id,
      meta: {
        before: {
          speciesId: before.speciesId,
          generation: before.generation,
          breedCount: before.breedCount,
          status: before.status,
        },
        after: pet
          ? {
              speciesId: pet.speciesId,
              generation: pet.generation,
              breedCount: pet.breedCount,
              status: pet.status,
            }
          : null,
      },
    });

    return NextResponse.json(ok({ pet }));
  } catch (err) {
    if (isZodError(err)) {
      const issues = collectZodIssues(err);
      return NextResponse.json(
        fail("VALIDATION_ERROR", issues.length > 0 ? issues.join("; ") : "参数校验失败"),
        { status: 400 },
      );
    }
    return handleApiError("PUT /api/admin/animals/[id]", err);
  }
}

/** DELETE /api/admin/animals/[id] — 删除宠物。 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await ctx.params;
  const before = await getAdminAnimalById(id);
  if (!before) {
    return NextResponse.json(fail("NOT_FOUND", "宠物不存在"), { status: 404 });
  }

  await deleteAnimal(id);

  await createAuditLog({
    action: "animal.delete",
    resource: "animals",
    targetId: id,
    meta: {
      ownerId: before.ownerId,
      speciesId: before.speciesId,
      generation: before.generation,
    },
  });

  return NextResponse.json(ok({}));
}
