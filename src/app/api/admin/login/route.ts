import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { signIn, setAuthCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";
import { ok, fail } from "@/types";
import { hasServerEnv } from "@/env";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!hasServerEnv()) {
    return NextResponse.json(
      fail("SERVER_NOT_CONFIGURED", "服务端环境变量未配置"),
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
    if (err instanceof ZodError) {
      return NextResponse.json(
        fail("VALIDATION_ERROR", err.issues[0]?.message ?? "参数错误"),
        { status: 400 },
      );
    }
    return NextResponse.json(fail("INTERNAL", "服务器错误"), { status: 500 });
  }
}
