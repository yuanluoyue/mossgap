import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // 禁用 incremental cache，避免需要额外的 R2 bucket
  // 项目大部分页面是 force-dynamic SSR，不需要 ISR/SSG 缓存
  dangerous: {
    disableIncrementalCache: true,
    disableTagCache: true,
  },
});
