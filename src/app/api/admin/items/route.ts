import { NextResponse } from "next/server";

import { requireAdmin, parseJson } from "@/lib/api-guard";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { createAuditLog } from "@/lib/audit-log";
import { createItem, listAllItems, getItemByCode } from "@/db/queries";
import { listItemsQuerySchema, itemCreateSchema } from "@/lib/validators";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/items — 物品列表（分页 + 搜索 + 过滤）。 */
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const url = new URL(req.url);
    const sp = Object.fromEntries(url.searchParams.entries());
    const input = listItemsQuerySchema.parse(sp);

    const result = await listAllItems({
      page: input.page,
      pageSize: input.pageSize,
      search: input.search,
      type: input.type,
      enabled: input.enabled,
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
    return handleApiError("GET /api/admin/items", err);
  }
}

/** POST /api/admin/items — 创建物品。 */
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { data, error } = await parseJson<unknown>(req);
  if (error) return error;

  try {
    const input = itemCreateSchema.parse(data);

    // code 唯一性预检（数据库 uniqueIndex 也会拦截，提前给出友好错误）
    const existing = await getItemByCode(input.code);
    if (existing) {
      return NextResponse.json(
        fail("VALIDATION_ERROR", `物品 code "${input.code}" 已存在`),
        { status: 400 },
      );
    }

    const item = await createItem({
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
      action: "item.create",
      resource: "items",
      targetId: item.id,
      meta: { code: item.code, name: item.name, type: item.type, rarity: item.rarity },
    });

    return NextResponse.json(ok({ item }), { status: 201 });
  } catch (err) {
    if (isZodError(err)) {
      const issues = collectZodIssues(err);
      return NextResponse.json(
        fail("VALIDATION_ERROR", issues.length > 0 ? issues.join("; ") : "参数校验失败"),
        { status: 400 },
      );
    }
    return handleApiError("POST /api/admin/items", err);
  }
}
