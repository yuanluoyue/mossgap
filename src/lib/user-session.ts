import { NextResponse } from "next/server";

import {
  signAccessToken,
  verifyAccessToken,
  getAccessTokenFromCookie,
  getRefreshTokenFromCookie,
  setUserCookies,
  clearUserCookies,
  generateRefreshToken,
  hashToken,
  USER_REFRESH_TTL,
} from "@/lib/user-auth";
import { getClientIp, getClientUserAgent } from "@/lib/api-guard";
import {
  findValidSession,
  rotateSession,
  getPublicUserById,
  type PublicUser,
} from "@/db/queries";

/**
 * 在 Route Handler / Server Component 中读取当前 C 端登录用户。
 *
 * 流程：
 * 1. 先校验 access token；有效 → 返回 user
 * 2. access 无效但 refresh 有效 → 轮换 refresh + 签发新 access，
 *    通过 setCookies 写回，返回 user（payload.refreshed = true）
 * 3. 都无效 → 返回 null
 *
 * 注意：因为这里会写 cookie，只能在 Route Handler / Server Action / 
 * Server Component 顶层调用，不能在普通工具函数中调用。
 */
export async function getCurrentUser(): Promise<{
  user: PublicUser | null;
  refreshed: boolean;
}> {
  // 1. access token
  const accessToken = await getAccessTokenFromCookie();
  if (accessToken) {
    const payload = await verifyAccessToken(accessToken);
    if (payload) {
      const user = await getPublicUserById(payload.sub);
      if (user) return { user, refreshed: false };
    }
  }

  // 2. refresh token
  const refreshToken = await getRefreshTokenFromCookie();
  if (!refreshToken) return { user: null, refreshed: false };

  const hash = await hashToken(refreshToken);
  const valid = await findValidSession(hash);
  if (!valid) {
    // refresh 也无效，清掉 cookie 防止重复尝试
    await clearUserCookies();
    return { user: null, refreshed: false };
  }

  // 轮换：新 refresh + 新 access
  const newRefresh = generateRefreshToken();
  const newHash = await hashToken(newRefresh);
  const now = Math.floor(Date.now() / 1000);
  const ip = await getClientIp();
  const ua = await getClientUserAgent();
  await rotateSession({
    oldSessionId: valid.session.id,
    userId: valid.user.id,
    newRefreshTokenHash: newHash,
    ip,
    userAgent: ua,
    expiresAt: now + USER_REFRESH_TTL,
  });
  const newAccess = await signAccessToken(valid.user.id);
  await setUserCookies(newAccess, newRefresh);

  const user = await getPublicUserById(valid.user.id);
  return { user, refreshed: true };
}

/** 在 Route Handler 中要求登录；未登录返回 401 响应，否则返回 null。 */
export async function requireUser(): Promise<
  { user: PublicUser } | NextResponse
> {
  const { user } = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "未登录或登录已过期" } },
      { status: 401 },
    );
  }
  return { user };
}

/** 在 Server Component 中读取当前登录用户（不抛错，返回 null 表示未登录）。 */
export async function getCurrentUserOrNull(): Promise<PublicUser | null> {
  // 在 Server Component 中 getCurrentUser 也能工作（cookies() 可用），
  // 但为避免组件树多次轮换 refresh，这里只读 access，不主动 refresh。
  const accessToken = await getAccessTokenFromCookie();
  if (accessToken) {
    const payload = await verifyAccessToken(accessToken);
    if (payload) {
      const user = await getPublicUserById(payload.sub);
      if (user) return user;
    }
  }
  return null;
}

export { signAccessToken, verifyAccessToken };
