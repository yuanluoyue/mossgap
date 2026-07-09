import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    // 游戏封面/截图来自 R2 公共域名，Cloudflare Workers 上不做 Next 图片优化
    unoptimized: true,
  },
  // Cloudflare Workers 运行时不支持 edge runtime，所有路由使用默认 nodejs 运行时
  // 允许在服务端使用 @aws-sdk/client-s3 等 Node 风格包（依赖 nodejs_compat）
  serverExternalPackages: ["@aws-sdk/client-s3"],
};

// 仅在本地开发时初始化 OpenNext for Cloudflare（绑定等）
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

export default withSentryConfig(withNextIntl(nextConfig), {
  org: "snow-do",
  project: "mossgap",
  silent: !process.env.CI,
  // 上传更完整的 source map 以获得更清晰的错误堆栈
  widenClientFileUpload: true,
});
