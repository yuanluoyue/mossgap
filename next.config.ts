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
  experimental: {
    // 优化大型库的按需导入，减少构建扫描时间
    optimizePackageImports: ["lucide-react", "radix-ui"],
  },
};

// 仅在本地开发时初始化 OpenNext for Cloudflare（绑定等）
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

export default withNextIntl(nextConfig);
