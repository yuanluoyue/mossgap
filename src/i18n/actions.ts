"use server";

import { cookies } from "next/headers";

import { routing } from "./routing";

const COOKIE_NAME = "NEXT_LOCALE";

/**
 * 切换语言：写入 NEXT_LOCALE cookie，下次请求生效
 * 适用于 localePrefix: "never" 的单 URL cookie 模式
 */
export async function setLocale(locale: string) {
  const valid = routing.locales.includes(locale as (typeof routing.locales)[number]);
  if (!valid) return;
  const store = await cookies();
  store.set(COOKIE_NAME, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 年
    sameSite: "lax",
  });
}
