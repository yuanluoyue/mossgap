import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // 支持的语言：英文优先
  locales: ["en", "zh"],
  defaultLocale: "en",
  // 不使用 URL 前缀，仅通过 cookie 切换语言（单 URL）
  localePrefix: "never",
});
