import { NextResponse } from "next/server";

import { putObjectsDirect } from "@/lib/oss";
import { getServerEnv } from "@/env";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/upload-internal
 * 内部批量上传 route，由 putObjects 通过 fetch 公开 URL 调用（分批避开 50 subrequest 限制）。
 * 用 x-internal-key（JWT_SECRET）做内部认证，防止外部直接调用。
 */
export async function POST(req: Request) {
  const internalKey = req.headers.get("x-internal-key");
  const e = await getServerEnv();
  if (!internalKey || internalKey !== e.JWT_SECRET) {
    return NextResponse.json(fail("UNAUTHORIZED", "无权访问"), { status: 401 });
  }

  const formData = await req.formData();
  const prefix = formData.get("prefix");
  if (typeof prefix !== "string") {
    return NextResponse.json(fail("BAD_REQUEST", "缺少 prefix"), {
      status: 400,
    });
  }

  const files: { path: string; data: Uint8Array }[] = [];
  for (const [key, value] of formData.entries()) {
    if (key === "prefix") continue;
    if (value instanceof File) {
      files.push({
        path: key,
        data: new Uint8Array(await value.arrayBuffer()),
      });
    }
  }

  if (files.length === 0) {
    return NextResponse.json(fail("EMPTY", "没有文件"), { status: 400 });
  }

  await putObjectsDirect(prefix, files);
  return NextResponse.json(ok({ count: files.length }));
}
