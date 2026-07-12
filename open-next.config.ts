import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

/**
 * ISR 缓存开关。
 *
 * - 开启（ENABLE_ISR=true）：使用 R2 bucket 作为 incremental cache，支持运行时 revalidation。
 *   需要 wrangler.jsonc 中配置 r2_buckets binding NEXT_INC_CACHE_R2_BUCKET。
 * - 关闭（默认）：使用 Workers 静态资源缓存（只读），仅服务构建时预渲染的页面，
 *   不支持运行时 revalidation，内容更新需要重新部署。
 */
const enableIsr = process.env.ENABLE_ISR === "true";

export default defineCloudflareConfig({
  incrementalCache: enableIsr ? r2IncrementalCache : staticAssetsIncrementalCache,
  tagCache: "dummy",
});
