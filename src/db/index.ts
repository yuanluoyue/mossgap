import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

/**
 * Drizzle 客户端（基于 Cloudflare D1 binding）。
 *
 * - 生产：通过 OpenNext 部署到 Cloudflare Workers，使用 D1 binding。
 * - 本地：通过 `initOpenNextCloudflareForDev` 注入 wrangler 本地 D1 模拟。
 *
 * 由于 `getCloudflareContext({ async: true })` 是异步的，`getDb` 也为异步。
 */
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _pending: Promise<ReturnType<typeof drizzle<typeof schema>>> | null = null;

export async function getDb() {
  if (_db) return _db;
  if (_pending) return _pending;
  _pending = (async () => {
    const ctx = await getCloudflareContext({ async: true });
    const d1 = ctx.env.DB;
    if (!d1) {
      throw new Error(
        "D1 数据库绑定 DB 未找到。请检查 wrangler.jsonc 中 d1_databases 配置。",
      );
    }
    _db = drizzle(d1, { schema });
    return _db;
  })();
  try {
    return await _pending;
  } finally {
    _pending = null;
  }
}

export { schema };
