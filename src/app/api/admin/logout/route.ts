import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";
import { ok } from "@/types";

export const runtime = "nodejs";

export async function POST() {
  await clearAuthCookie();
  return NextResponse.json(ok({}));
}
