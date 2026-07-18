import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { getServerEnv } from "@/env";

/**
 * C 端用户认证模块。
 *
 * 双 Token 设计：
 * - access token：JWT（HS256），短期 15min，存在客户端 cookie，不入库
 * - refresh token：32 字节随机 hex，长期 30d，仅以 SHA-256 哈希存 sessions 表
 *   明文通过 httpOnly cookie 下发；每次刷新即轮换（一次一换）防重放
 *
 * Cookie 名：
 * - mossgap_user_access：JWT
 * - mossgap_user_refresh：refresh token 明文
 */

const ACCESS_COOKIE = "mossgap_user_access";
const REFRESH_COOKIE = "mossgap_user_refresh";

const ACCESS_TTL = 15 * 60; // 15 分钟
const REFRESH_TTL = 30 * 24 * 60 * 60; // 30 天

/** Google OAuth 端点 */
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

/** access token 载荷。 */
export interface UserAccessPayload {
  sub: string; // user id
  type: "access";
}

/** Google userinfo 返回结构（用到的字段）。 */
export interface GoogleUserInfo {
  sub: string; // Google 用户 ID
  email?: string;
  emailVerified?: boolean;
  name?: string;
  picture?: string;
  locale?: string;
}

// ─── secret / token 生成 ────────────────────────────────────

async function secret(): Promise<Uint8Array> {
  const env = await getServerEnv();
  return new TextEncoder().encode(env.JWT_SECRET);
}

/** 生成 32 字节随机 hex refresh token。 */
export function generateRefreshToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** SHA-256 哈希（hex），用于存储 refresh token。 */
export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

// ─── JWT 签发 / 校验 ─────────────────────────────────────────

export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({ type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL}s`)
    .sign(await secret());
}

export async function verifyAccessToken(
  token: string,
): Promise<UserAccessPayload | null> {
  try {
    const { payload } = await jwtVerify(token, await secret());
    if (payload.type !== "access") return null;
    return { sub: payload.sub as string, type: "access" };
  } catch {
    return null;
  }
}

// ─── Cookie 操作 ─────────────────────────────────────────────

export async function setUserCookies(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  const store = await cookies();
  const secure = process.env.NODE_ENV === "production";
  store.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TTL,
  });
  store.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TTL,
  });
}

export async function clearUserCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

/** 读取 refresh token cookie 明文（用于轮换）。 */
export async function getRefreshTokenFromCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value ?? null;
}

/** 读取 access token cookie。 */
export async function getAccessTokenFromCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

export const USER_ACCESS_COOKIE = ACCESS_COOKIE;
export const USER_REFRESH_COOKIE = REFRESH_COOKIE;
export const USER_ACCESS_TTL = ACCESS_TTL;
export const USER_REFRESH_TTL = REFRESH_TTL;

// ─── Google OAuth 流程 ───────────────────────────────────────

/** 推导回调 URL（未显式配置时基于 NEXT_PUBLIC_APP_URL）。 */
export async function getGoogleRedirectUri(): Promise<string> {
  const env = await getServerEnv();
  if (env.GOOGLE_REDIRECT_URI) return env.GOOGLE_REDIRECT_URI;
  const base = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/auth/google/callback`;
}

/** 是否已配置 Google OAuth。 */
export async function isGoogleConfigured(): Promise<boolean> {
  const env = await getServerEnv();
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

/** 生成 Google 授权 URL（state 用于防 CSRF，调用方提供并校验）。 */
export async function buildGoogleAuthUrl(opts: {
  state: string;
  /** 登录后跳转的目标路径，编码到 state 中由调用方解析；此处直接附加到 state */
  next?: string;
}): Promise<string> {
  const env = await getServerEnv();
  const redirectUri = await getGoogleRedirectUri();
  // state 格式：随机 csrf + ":" + next（如果有）
  const state = opts.next
    ? `${opts.state}:${opts.next}`
    : opts.state;
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/** 用 authorization code 换取 access token + id token。 */
export async function exchangeGoogleCode(
  code: string,
): Promise<{
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_in?: number;
} | null> {
  const env = await getServerEnv();
  const redirectUri = await getGoogleRedirectUri();
  const body = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID!,
    client_secret: env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    console.error("[user-auth] exchangeGoogleCode 失败", await res.text());
    return null;
  }
  return (await res.json()) as {
    access_token: string;
    id_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
}

/** 用 Google access_token 拉取用户信息。 */
export async function fetchGoogleUserInfo(
  accessToken: string,
): Promise<GoogleUserInfo | null> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    console.error("[user-auth] fetchGoogleUserInfo 失败", await res.text());
    return null;
  }
  const data = (await res.json()) as Partial<GoogleUserInfo> & {
    email_verified?: boolean;
  };
  return {
    sub: data.sub ?? "",
    email: data.email,
    emailVerified: data.email_verified,
    name: data.name,
    picture: data.picture,
    locale: data.locale,
  };
}

// ─── state 校验（简单 CSRF 保护） ────────────────────────────

/** 生成随机 state 并存入短期 cookie。 */
export async function issueStateAndCookie(state: string): Promise<void> {
  const store = await cookies();
  store.set("mossgap_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60, // 10 分钟
  });
}

/** 校验 state 与 cookie 中的一致。 */
export async function verifyState(state: string): Promise<boolean> {
  const store = await cookies();
  const saved = store.get("mossgap_oauth_state")?.value;
  if (!saved || saved !== state) return false;
  // 一次性
  store.delete("mossgap_oauth_state");
  return true;
}

/** 从 callback state 中解析 next 路径（如未编码返回 "/"）。 */
export function parseStateNext(state: string): { csrf: string; next: string } {
  const idx = state.indexOf(":");
  if (idx < 0) return { csrf: state, next: "/" };
  const csrf = state.slice(0, idx);
  const next = state.slice(idx + 1);
  // 仅允许站内路径
  if (!next.startsWith("/") || next.startsWith("//")) {
    return { csrf, next: "/" };
  }
  return { csrf, next };
}
