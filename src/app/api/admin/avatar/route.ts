import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api-guard";
import { handleApiError } from "@/lib/api-error";
import { createAuditLog } from "@/lib/audit-log";
import { getAuthPayload } from "@/lib/auth";
import { updateAdmin, getAdminById } from "@/db/queries";
import {
  putImage,
  isAllowedImageExt,
  deleteObject,
  extractKeyFromUrl,
} from "@/lib/oss";
import { ok, fail } from "@/types";
import { hasServerEnv } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 单张头像最大 2MB */
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

/** POST /api/admin/avatar — 上传当前管理员头像
 * Body: multipart/form-data
 *   - file: 图片文件
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

  const me = await getAuthPayload();
  if (!me) {
    return NextResponse.json(fail("UNAUTHORIZED", "未登录或登录已过期"), {
      status: 401,
    });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    console.error("[API] POST /api/admin/avatar · formData 解析失败", err);
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
    const admin = await getAdminById(me.sub);
    if (admin?.avatar) {
      const oldKey = extractKeyFromUrl(admin.avatar);
      if (oldKey) {
        try {
          await deleteObject(oldKey);
        } catch {
          // 旧图删除失败不阻塞
        }
      }
    }

    await updateAdmin(me.sub, { avatar: url });

    await createAuditLog({
      action: "profile.update_avatar",
      resource: "profile",
      targetId: me.sub,
      meta: { filename: file.name, size: file.size },
    });

    return NextResponse.json(ok({ url }), { status: 201 });
  } catch (err) {
    return handleApiError("POST /api/admin/avatar", err);
  }
}
