import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // 支持的语言：英文优先
  locales: ["en", "zh"],
  defaultLocale: "en",
  // 不使用 URL 前缀，仅通过 cookie 切换语言（单 URL）
  // 搜索引擎默认拿到英文（defaultLocale）
  localePrefix: "never",
  // 开启 localeDetection 以支持 cookie 切换语言
  // 首次访问无 cookie 时走 defaultLocale (en)，搜索引擎拿到英文
  localeDetection: true,
});
