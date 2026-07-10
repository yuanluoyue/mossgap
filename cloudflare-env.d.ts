/// <reference types="@cloudflare/workers-types" />

// Cloudflare Workers 环境变量与 bindings 类型声明
// 对应 wrangler.jsonc 中的 bindings，可手动维护或通过 `pnpm cf-typegen` 重新生成

interface CloudflareEnv {
  // d1_databases
  DB: D1Database;
  // r2_buckets
  GAMES_BUCKET: R2Bucket;
  // services（自身引用）
  WORKER_SELF_REFERENCE: Fetcher;
  // images
  IMAGES: ImageLoader;
  // assets
  ASSETS: Fetcher;
}
