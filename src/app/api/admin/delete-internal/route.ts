import { NextResponse } from "next/server";

import { getServerEnv } from "@/env";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/delete-internal
 * 内部批量删除 route，仅由 deletePrefix 通过 WORKER_SELF_REFERENCE service binding 调用。
 * 用 x-internal-key（JWT_SECRET）做内部认证，防止外部直接调用。
 *
 * Body: { "keys": ["key1", "key2", ...] }
 * keys 为完整存储 key（已含 S3_KEY_PREFIX）。
 */
export async function POST(req: Request) {
  const internalKey = req.headers.get("x-internal-key");
  const e = await getServerEnv();
  if (!internalKey || internalKey !== e.JWT_SECRET) {
    return NextResponse.json(fail("UNAUTHORIZED", "无权访问"), { status: 401 });
  }

  const body = (await req.json()) as { keys?: unknown };
  if (!Array.isArray(body.keys) || body.keys.length === 0) {
    return NextResponse.json(fail("BAD_REQUEST", "缺少 keys"), {
      status: 400,
    });
  }

  // 动态导入，避免循环依赖
  const { aws4FetchAdapter } = await import("@/lib/oss-adapter-aws4fetch");
  await aws4FetchAdapter.deleteObjects(body.keys as string[]);
  return NextResponse.json(ok({ count: body.keys.length }));
}
