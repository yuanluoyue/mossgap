import { NextResponse } from "next/server";

import { requireUser } from "@/lib/user-session";
import { handleApiError } from "@/lib/api-error";
import { updateUserProfile, getPublicUserById } from "@/db/queries";
import {
  putImage,
  isAllowedImageExt,
  deleteObject,
  extractKeyFromUrl,
} from "@/lib/oss";
import { ok, fail } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 单张头像最大 2MB */
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

/**
 * POST /api/auth/avatar — 当前 C 端用户上传头像。
 * Body: multipart/form-data
 *   - file: 图片文件
 */
export async function POST(req: Request) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    console.error("[API] POST /api/auth/avatar · formData 解析失败", err);
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

  if (!isAllowedImageExt(file.name)) {
    return NextResponse.json(
      fail("BAD_FILE", "仅支持 PNG/JPG/JPEG/GIF/WEBP/SVG 图片"),
      { status: 400 },
    );
  }

  if (file.size > MAX_AVATAR_SIZE) {
    return NextResponse.json(
      fail("BAD_FILE", "头像大小不能超过 2MB"),
      { status: 400 },
    );
  }

  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    const { url } = await putImage("avatar", file.name, buf);

    // 删除旧头像（如有）
    if (guard.user.avatar) {
      const oldKey = await extractKeyFromUrl(guard.user.avatar);
      if (oldKey) {
        try {
          await deleteObject(oldKey);
        } catch {
          // 旧图删除失败不阻塞
        }
      }
    }

    await updateUserProfile(guard.user.id, { avatar: url });
    const fresh = await getPublicUserById(guard.user.id);
    return NextResponse.json(ok({ user: fresh }), { status: 201 });
  } catch (err) {
    return handleApiError("POST /api/auth/avatar", err);
  }
}
