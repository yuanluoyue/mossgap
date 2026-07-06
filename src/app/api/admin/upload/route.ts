import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { extractZip } from "@/lib/zip";
import { putObjects, deletePrefix } from "@/lib/oss";
import { createGame } from "@/db/queries";
import { requireAdmin } from "@/lib/api-guard";
import { ok, fail } from "@/types";
import type { UploadGameResponse } from "@/types";
import { hasServerEnv } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 单个 zip 最大 200MB */
const MAX_ZIP_SIZE = 200 * 1024 * 1024;

/** POST /api/admin/upload — 上传 zip 游戏包，解压并传到 R2 */
export async function POST(req: Request) {
  if (!hasServerEnv()) {
    return NextResponse.json(
      fail("SERVER_NOT_CONFIGURED", "服务端环境变量未配置"),
      { status: 503 },
    );
  }
  const guard = await requireAdmin();
  if (guard) return guard;

  // 解析 multipart 表单
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(fail("BAD_REQUEST", "无法解析表单数据"), {
      status: 400,
    });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(fail("BAD_REQUEST", "缺少 file 字段"), {
      status: 400,
    });
  }
  if (!file.name.toLowerCase().endsWith(".zip")) {
    return NextResponse.json(fail("BAD_FILE", "仅支持 .zip 文件"), {
      status: 400,
    });
  }
  if (file.size > MAX_ZIP_SIZE) {
    return NextResponse.json(
      fail("FILE_TOO_LARGE", `文件大小不能超过 ${MAX_ZIP_SIZE / 1024 / 1024}MB`),
      { status: 413 },
    );
  }

  // 读取 zip 内容
  const buf = new Uint8Array(await file.arrayBuffer());

  // 解压
  let extracted;
  try {
    extracted = await extractZip(buf);
  } catch {
    return NextResponse.json(fail("BAD_ZIP", "zip 文件解压失败"), {
      status: 400,
    });
  }
  if (extracted.files.length === 0) {
    return NextResponse.json(fail("EMPTY_ZIP", "zip 包内没有有效文件"), {
      status: 400,
    });
  }

  // 生成唯一 ossPrefix
  const ossPrefix = `games/${randomUUID()}`;

  // 上传到 R2
  try {
    await putObjects(
      ossPrefix,
      extracted.files.map((f) => ({ path: f.path, data: f.data })),
    );
  } catch (err) {
    // 上传失败时清理已上传的部分
    try {
      await deletePrefix(ossPrefix);
    } catch {
      // 忽略清理错误
    }
    return NextResponse.json(
      fail("UPLOAD_FAILED", `上传到 OSS 失败: ${(err as Error).message}`),
      { status: 502 },
    );
  }

  // 从文件名生成默认标题
  const baseName = file.name.replace(/\.zip$/i, "");
  const title = baseName || "Untitled Game";

  // 创建草稿游戏记录
  const game = await createGame({
    slug: `${baseName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${randomUUID().slice(0, 8)}`,
    title,
    description: "",
    category: "other",
    coverImage: "",
    screenshots: [],
    entryFile: extracted.detectedEntry ?? "index.html",
    ossPrefix,
    status: "draft",
    locale: {
      en: { title, description: "" },
      zh: { title, description: "" },
    },
  });

  const payload: UploadGameResponse = {
    id: game.id,
    ossPrefix,
    detectedEntry: extracted.detectedEntry,
    files: extracted.files.map((f) => ({ path: f.path, size: f.size })),
  };

  return NextResponse.json(ok(payload), { status: 201 });
}
