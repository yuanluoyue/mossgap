import { NextResponse } from "next/server";

import { putImage, isAllowedImageExt, deleteObject, extractKeyFromUrl } from "@/lib/oss";
import {
  requireAdmin,
  getClientIp,
  getClientUserAgent,
} from "@/lib/api-guard";
import { handleApiError } from "@/lib/api-error";
import { writeOperationLog } from "@/db/queries";
import { ok, fail } from "@/types";
import type { ImageCategory } from "@/lib/oss";
import { hasServerEnv } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 单张图片最大 5MB */
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const VALID_CATEGORIES: ImageCategory[] = ["cover", "screenshot"];

/** POST /api/admin/upload-image — 上传图片到 OSS
 * Body: multipart/form-data
 *   - file: 图片文件
 *   - category: "cover" | "screenshot"
 *   - replaceUrl?: 旧图片 URL（上传成功后自动删除旧图）
 */
export async function POST(req: Request) {
  if (!hasServerEnv()) {
    return NextResponse.json(
      fail("SERVER_NOT_CONFIGURED", "服务端环境变量未配置"),
      { status: 503 },
    );
  }
  const guard = await requireAdmin();
  if (guard) return guard;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    console.error("[API] POST /api/admin/upload-image · formData 解析失败", err);
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

  const category = String(formData.get("category") ?? "cover") as ImageCategory;
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json(
      fail("BAD_REQUEST", "category 必须是 cover 或 screenshot"),
      { status: 400 },
    );
  }

  if (!isAllowedImageExt(file.name)) {
    return NextResponse.json(
      fail("BAD_FILE", "仅支持 PNG/JPG/JPEG/GIF/WEBP/SVG 图片"),
      { status: 400 },
    );
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return NextResponse.json(
      fail("BAD_FILE", "图片大小不能超过 5MB"),
      { status: 400 },
    );
  }

  const buf = new Uint8Array(await file.arrayBuffer());

  try {
    const { url } = await putImage(category, file.name, buf);

    // 如果传了 replaceUrl，尝试删除旧图片
    const replaceUrl = formData.get("replaceUrl");
    if (replaceUrl) {
      const oldKey = extractKeyFromUrl(String(replaceUrl));
      if (oldKey) {
        try {
          await deleteObject(oldKey);
        } catch {
          // 旧图删除失败不阻塞
        }
      }
    }

    // 操作日志
    try {
      const [ip, ua] = await Promise.all([getClientIp(), getClientUserAgent()]);
      await writeOperationLog({
        action: "image.upload",
        targetType: "image",
        meta: { category, filename: file.name, size: file.size },
        operatorIp: ip,
        operatorUseragent: ua,
      });
    } catch {
      // 日志失败不阻塞
    }

    return NextResponse.json(ok({ url }), { status: 201 });
  } catch (err) {
    return handleApiError("POST /api/admin/upload-image", err);
  }
}
