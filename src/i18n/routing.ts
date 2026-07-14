import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // 支持的语言：英文优先
  locales: ["en", "zh"],
  defaultLocale: "en",
  // 不使用 URL 前缀，仅通过 cookie 切换语言（单 URL）
  localePrefix: "never",
  // 关闭基于浏览器 Accept-Language 的自动探测，强制首次访问走 defaultLocale (en)
  localeDetection: false,
});
