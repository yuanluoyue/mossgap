import { NextResponse } from "next/server";

import { signIn, setAuthCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";
import { handleApiError } from "@/lib/api-error";
import { ok, fail } from "@/types";
import { hasServerEnv } from "@/env";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await hasServerEnv())) {
    let detail = "服务端环境变量未配置";
    try {
      const { getServerEnv } = await import("@/env");
      await getServerEnv();
    } catch (e) {
      detail = e instanceof Error ? e.message : String(e);
    }
    return NextResponse.json(
      fail("SERVER_NOT_CONFIGURED", detail),
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(fail("BAD_REQUEST", "请求体不是合法 JSON"), {
      status: 400,
    });
  }

  try {
    const { username, password } = loginSchema.parse(body);
    const result = await signIn(username, password);
    if (!result.ok) {
      return NextResponse.json(fail("INVALID_CREDENTIALS", result.message), {
        status: 401,
      });
    }
    await setAuthCookie(result.token);
    return NextResponse.json(ok({ username }));
  } catch (err) {
    return handleApiError("POST /api/admin/login", err);
  }
}
