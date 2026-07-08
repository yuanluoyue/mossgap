import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { getServerEnv } from "@/env";
import { getAdminByUsername } from "@/db/queries";
import { verifyPassword } from "@/lib/password";

const COOKIE_NAME = "mossgap_admin";
const TOKEN_TTL = 60 * 60 * 24 * 7; // 7 天

function secret(): Uint8Array {
  return new TextEncoder().encode(getServerEnv().JWT_SECRET);
}

/** JWT 载荷类型。 */
export interface AuthPayload {
  sub: string; // admin id
  username: string;
  role: string;
}

/** 校验账号密码并签发 JWT。 */
export async function signIn(
  username: string,
  password: string,
): Promise<{ ok: true; token: string } | { ok: false; message: string }> {
  const admin = await getAdminByUsername(username);
  if (!admin) {
    return { ok: false, message: "用户名或密码错误" };
  }
  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) {
    return { ok: false, message: "用户名或密码错误" };
  }
  const token = await new SignJWT({ role: "admin", sub: admin.id, username: admin.username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL}s`)
    .sign(secret());
  return { ok: true, token };
}

/** 校验 JWT 有效性。 */
export async function verifyToken(
  token: string,
): Promise<boolean> {
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}

/** 在服务端读取当前是否已登录（用于 Server Components / Route Handlers）。 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyToken(token);
}

/**
 * 在服务端读取当前登录管理员的 JWT 载荷（已校验）。
 * 用于 RBAC：获取 adminId 以查询用户的角色与菜单。
 */
export async function getAuthPayload(): Promise<AuthPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as AuthPayload;
  } catch {
    return null;
  }
}

/** 设置登录 Cookie（在 Route Handler 中调用）。 */
export async function setAuthCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_TTL,
  });
}

/** 清除登录 Cookie。 */
export async function clearAuthCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export const AUTH_COOKIE = COOKIE_NAME;
