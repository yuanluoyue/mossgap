import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { fail } from "@/types";

/** 校验 Admin 登录态；未登录返回 401 响应，否则返回 null。 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const ok = await isAdminAuthenticated();
  if (!ok) {
    return NextResponse.json(fail("UNAUTHORIZED", "未登录或登录已过期"), {
      status: 401,
    });
  }
  return null;
}

/** 解析 JSON 请求体；失败时返回 400 响应。 */
export async function parseJson<T>(
  req: Request,
): Promise<{ data: T | null; error: NextResponse | null }> {
  try {
    const data = (await req.json()) as T;
    return { data, error: null };
  } catch {
    return {
      data: null,
      error: NextResponse.json(fail("BAD_REQUEST", "请求体不是合法 JSON"), {
        status: 400,
      }),
    };
  }
}
