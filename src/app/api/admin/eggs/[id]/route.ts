import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api-guard";
import { handleApiError } from "@/lib/api-error";
import { createAuditLog } from "@/lib/audit-log";
import { deleteEgg, getAdminEggById } from "@/db/queries";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/eggs/[id] — 蛋详情。 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const { id } = await params;
    const egg = await getAdminEggById(id);
    if (!egg) {
      return NextResponse.json(fail("NOT_FOUND", "蛋不存在"), { status: 404 });
    }
    return NextResponse.json(ok({ egg }));
  } catch (err) {
    return handleApiError("GET /api/admin/eggs/[id]", err);
  }
}

/** DELETE /api/admin/eggs/[id] — 删除蛋。 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const { id } = await params;
    const egg = await getAdminEggById(id);
    if (!egg) {
      return NextResponse.json(fail("NOT_FOUND", "蛋不存在"), { status: 404 });
    }

    const deleted = await deleteEgg(id);
    if (!deleted) {
      return NextResponse.json(fail("NOT_FOUND", "蛋不存在"), { status: 404 });
    }

    await createAuditLog({
      action: "egg.delete",
      resource: "eggs",
      targetId: id,
      meta: { ownerId: egg.ownerId, generation: egg.generation },
    });

    return NextResponse.json(ok({ deleted: true }));
  } catch (err) {
    return handleApiError("DELETE /api/admin/eggs/[id]", err);
  }
}
