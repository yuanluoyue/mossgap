import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

export default defineCloudflareConfig({
  // 使用 Workers 静态资源作为 incremental cache
  // 只读模式，不需要额外的 R2 bucket
  // 适用于不做 ISR/revalidation 的应用
  incrementalCache: staticAssetsIncrementalCache,
  tagCache: "dummy",
});
