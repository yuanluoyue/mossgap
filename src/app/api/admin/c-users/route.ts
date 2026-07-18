import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api-guard";
import { handleApiError, isZodError, collectZodIssues } from "@/lib/api-error";
import { listCUsers } from "@/db/queries";
import { listCUsersQuerySchema } from "@/lib/validators";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/c-users — C 端用户列表（分页 + 搜索 + 状态过滤）。 */
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const url = new URL(req.url);
    const sp = Object.fromEntries(url.searchParams.entries());
    const input = listCUsersQuerySchema.parse(sp);

    const result = await listCUsers({
      page: input.page,
      pageSize: input.pageSize,
      search: input.search,
      isActive: input.isActive,
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
    return handleApiError("GET /api/admin/c-users", err);
  }
}

// 注：C 端用户由 OAuth 自动创建，B 端不直接创建
