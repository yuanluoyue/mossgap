import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;

  // localePrefix: "never" 模式下 URL 不变，middleware 无法通过 URL 区分 locale。
  // 这里主动读 NEXT_LOCALE cookie 决定 locale：
  // - 有 cookie：用 cookie 中的 locale（用户之前选过的）
  // - 无 cookie：用 defaultLocale（en），搜索引擎首次访问拿到英文
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;

  const locale = hasLocale(routing.locales, cookieLocale)
    ? cookieLocale
    : hasLocale(routing.locales, requested)
      ? requested
      : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
