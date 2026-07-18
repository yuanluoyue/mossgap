import { NextResponse } from "next/server";

import {
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  verifyState,
  parseStateNext,
  signAccessToken,
  setUserCookies,
  generateRefreshToken,
  hashToken,
  isGoogleConfigured,
  USER_REFRESH_TTL,
} from "@/lib/user-auth";
import { getClientIp, getClientUserAgent } from "@/lib/api-guard";
import {
  upsertUserFromOAuth,
  touchUserLastLogin,
  createSession,
  getPublicUserById,
} from "@/db/queries";
import { hasServerEnv } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/google/callback
 *
 * Google OAuth 授权回调。
 * 1. 校验 state（CSRF 防护）
 * 2. 用 code 换 access token
 * 3. 拉取 userinfo
 * 4. upsert user + authAccount
 * 5. 创建 session（refresh token 入库哈希）+ 签发 access JWT
 * 6. 写 cookie，重定向到 next 路径
 */
export async function GET(req: Request) {
  if (!(await hasServerEnv()) || !(await isGoogleConfigured())) {
    return NextResponse.redirect(
      new URL("/?login_error=oauth_not_configured", req.url),
    );
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/?login_error=${encodeURIComponent(error)}`, req.url),
    );
  }
  if (!code) {
    return NextResponse.redirect(new URL("/?login_error=missing_code", req.url));
  }

  // 校验 state（含 csrf 比对）
  const { csrf, next } = parseStateNext(state);
  const ok = await verifyState(csrf);
  if (!ok) {
    return NextResponse.redirect(new URL("/?login_error=bad_state", req.url));
  }

  // 换 token + 拉取 userinfo（网络调用，可能超时/失败）
  let tokens: Awaited<ReturnType<typeof exchangeGoogleCode>>;
  let info: Awaited<ReturnType<typeof fetchGoogleUserInfo>>;
  try {
    tokens = await exchangeGoogleCode(code);
  } catch (err) {
    console.error("[auth/callback] exchangeGoogleCode 网络错误", err);
    return NextResponse.redirect(
      new URL("/?login_error=network_error", req.url),
    );
  }
  if (!tokens?.access_token) {
    return NextResponse.redirect(
      new URL("/?login_error=token_exchange_failed", req.url),
    );
  }

  try {
    info = await fetchGoogleUserInfo(tokens.access_token);
  } catch (err) {
    console.error("[auth/callback] fetchGoogleUserInfo 网络错误", err);
    return NextResponse.redirect(
      new URL("/?login_error=network_error", req.url),
    );
  }
  if (!info || !info.sub) {
    return NextResponse.redirect(
      new URL("/?login_error=userinfo_failed", req.url),
    );
  }

  // upsert user
  const { userId } = await upsertUserFromOAuth({
    provider: "google",
    providerUserId: info.sub,
    providerEmail: info.email,
    name: info.name,
    avatar: info.picture,
    locale: info.locale,
  });

  // 检查用户是否被禁用
  const user = await getPublicUserById(userId);
  if (!user || !user.isActive) {
    return NextResponse.redirect(
      new URL("/?login_error=account_disabled", req.url),
    );
  }

  await touchUserLastLogin(userId);

  // 创建 session
  const refreshToken = generateRefreshToken();
  const refreshHash = await hashToken(refreshToken);
  const now = Math.floor(Date.now() / 1000);
  const ip = await getClientIp();
  const ua = await getClientUserAgent();
  await createSession({
    userId,
    refreshTokenHash: refreshHash,
    ip,
    userAgent: ua,
    expiresAt: now + USER_REFRESH_TTL,
  });

  const accessToken = await signAccessToken(userId);
  await setUserCookies(accessToken, refreshToken);

  // 重定向到 next 路径（站内）
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const target = new URL(safeNext, req.url);
  return NextResponse.redirect(target);
}
