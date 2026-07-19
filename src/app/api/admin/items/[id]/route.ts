import { NextResponse } from "next/server";

import { requireAdmin, parseJson } from "@/lib/api-guard";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { createAuditLog } from "@/lib/audit-log";
import { deleteItem, getItemById, updateItem, getItemByCode } from "@/db/queries";
import { itemUpdateSchema } from "@/lib/validators";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/items/[id] — 物品详情。 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await ctx.params;
  const item = await getItemById(id);
  if (!item) {
    return NextResponse.json(fail("NOT_FOUND", "物品不存在"), { status: 404 });
  }
  return NextResponse.json(ok({ item }));
}

/** PUT /api/admin/items/[id] — 更新物品。 */
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
    const input = itemUpdateSchema.parse(data);
    const before = await getItemById(id);
    if (!before) {
      return NextResponse.json(fail("NOT_FOUND", "物品不存在"), { status: 404 });
    }

    // code 唯一性预检（如果改了 code）
    if (input.code && input.code !== before.code) {
      const existing = await getItemByCode(input.code);
      if (existing && existing.id !== id) {
        return NextResponse.json(
          fail("VALIDATION_ERROR", `物品 code "${input.code}" 已存在`),
          { status: 400 },
        );
      }
    }

    const item = await updateItem(id, {
      code: input.code,
      type: input.type,
      name: input.name,
      description: input.description,
      icon: input.icon,
      rarity: input.rarity,
      stackable: input.stackable,
      maxStack: input.maxStack,
      enabled: input.enabled,
      sortOrder: input.sortOrder,
    });

    await createAuditLog({
      action: "item.update",
      resource: "items",
      targetId: id,
      meta: {
        before: {
          code: before.code,
          name: before.name,
          type: before.type,
          rarity: before.rarity,
          enabled: before.enabled,
        },
        after: item
          ? {
              code: item.code,
              name: item.name,
              type: item.type,
              rarity: item.rarity,
              enabled: item.enabled,
            }
          : null,
      },
    });

    return NextResponse.json(ok({ item }));
  } catch (err) {
    if (isZodError(err)) {
      const issues = collectZodIssues(err);
      return NextResponse.json(
        fail("VALIDATION_ERROR", issues.length > 0 ? issues.join("; ") : "参数校验失败"),
        { status: 400 },
      );
    }
    return handleApiError("PUT /api/admin/items/[id]", err);
  }
}

/** DELETE /api/admin/items/[id] — 删除物品（cascade user_inventory / inventory_logs）。 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await ctx.params;
  const before = await getItemById(id);
  if (!before) {
    return NextResponse.json(fail("NOT_FOUND", "物品不存在"), { status: 404 });
  }

  await deleteItem(id);

  await createAuditLog({
    action: "item.delete",
    resource: "items",
    targetId: id,
    meta: { code: before.code, name: before.name, type: before.type },
  });

  return NextResponse.json(ok({}));
}
