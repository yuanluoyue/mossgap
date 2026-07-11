import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { extractZip } from "@/lib/zip";
import { putObjects, deletePrefix } from "@/lib/oss";
import { getAdminGame, updateGame } from "@/db/queries";
import { requireAdmin } from "@/lib/api-guard";
import { createAuditLog } from "@/lib/audit-log";
import { handleApiError } from "@/lib/api-error";
import { ok, fail } from "@/types";
import { hasServerEnv } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 单个 zip 最大 200MB */
const MAX_ZIP_SIZE = 200 * 1024 * 1024;

/**
 * POST /api/admin/games/[id]/reupload
 * 重新上传游戏资源包（zip）。
 *
 * 流程：解压 → 上传到新 ossPrefix → 更新游戏记录 → 删除旧 ossPrefix。
 * 任一步失败会回滚（新上传的删掉，旧记录不动），保证旧资源仍可用。
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await hasServerEnv())) {
    return NextResponse.json(
      fail("SERVER_NOT_CONFIGURED", "服务端环境变量未配置"),
      { status: 503 },
    );
  }
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await ctx.params;

  // 读取现有游戏记录
  const existing = await getAdminGame(id);
  if (!existing) {
    return NextResponse.json(fail("NOT_FOUND", "游戏不存在"), { status: 404 });
  }
  if (existing.sourceType !== "zip") {
    return NextResponse.json(
      fail("UNSUPPORTED", "仅 zip 类型游戏支持重新上传"),
      { status: 400 },
    );
  }

  const oldOssPrefix = existing.ossPrefix || "";

  // 解析 multipart 表单
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    console.error("[API] reupload · formData 解析失败", err);
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

  // 读取并解压
  const buf = new Uint8Array(await file.arrayBuffer());
  let extracted;
  try {
    extracted = await extractZip(buf);
  } catch (err) {
    console.error("[API] reupload · zip 解压失败", err);
    return NextResponse.json(fail("BAD_ZIP", "zip 文件解压失败"), {
      status: 400,
    });
  }
  if (extracted.files.length === 0) {
    return NextResponse.json(fail("EMPTY_ZIP", "zip 包内没有有效文件"), {
      status: 400,
    });
  }

  // 生成新 ossPrefix 并上传
  const newOssPrefix = `games/${randomUUID()}`;
  try {
    await putObjects(
      newOssPrefix,
      extracted.files.map((f) => ({ path: f.path, data: f.data })),
    );
  } catch (err) {
    // 上传失败：清理已上传的部分，旧资源不受影响
    try {
      await deletePrefix(newOssPrefix);
    } catch (cleanErr) {
      console.error("[API] reupload · 清理新片段异常", cleanErr);
    }
    console.error("[API] reupload · OSS 上传失败", err);
    return NextResponse.json(
      fail("UPLOAD_FAILED", `上传到 OSS 失败: ${(err as Error).message}`),
      { status: 502 },
    );
  }

  const totalSize = extracted.files.reduce((sum, f) => sum + f.size, 0);
  const newEntry = extracted.detectedEntry ?? "index.html";

  // 切换游戏记录到新资源
  let updated;
  try {
    updated = await updateGame(id, {
      ossPrefix: newOssPrefix,
      entryFile: newEntry,
      ossSize: totalSize,
    });
  } catch (err) {
    // DB 切换失败：删除新上传的资源，旧记录保持不变
    try {
      await deletePrefix(newOssPrefix);
    } catch (cleanErr) {
      console.error("[API] reupload · DB 失败后清理新资源异常", cleanErr);
    }
    return handleApiError("POST /api/admin/games/[id]/reupload · updateGame", err);
  }
  if (!updated) {
    // 游戏被并发删除
    try {
      await deletePrefix(newOssPrefix);
    } catch {
      // ignore
    }
    return NextResponse.json(fail("NOT_FOUND", "游戏不存在"), { status: 404 });
  }

  // 切换成功：删除旧资源（失败不阻塞，只记日志）
  if (oldOssPrefix && oldOssPrefix !== newOssPrefix) {
    try {
      await deletePrefix(oldOssPrefix);
    } catch (err) {
      console.error("[API] reupload · 删除旧资源失败（不影响新资源）", {
        oldOssPrefix,
        err,
      });
    }
  }

  await createAuditLog({
    action: "game.reupload",
    resource: "game",
    targetId: id,
    meta: {
      oldOssPrefix,
      newOssPrefix,
      oldEntry: existing.entryFile,
      newEntry,
      ossSize: totalSize,
      fileName: file.name,
    },
  });

  return NextResponse.json(
    ok({
      ossPrefix: newOssPrefix,
      entryFile: newEntry,
      ossSize: totalSize,
      detectedEntry: extracted.detectedEntry,
      files: extracted.files.map((f) => ({ path: f.path, size: f.size })),
    }),
    { status: 200 },
  );
}
