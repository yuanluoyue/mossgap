import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // OpenNext (Cloudflare) 需要 standalone 输出
  output: "standalone",
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
  // 关闭 source map 上传以减小 Worker 体积
  // 错误堆栈会是压缩后代码，但 Sentry 仍能捕获错误
  sourcemaps: {
    disable: true,
  },
  // 不上传 client source map
  widenClientFileUpload: false,
});
