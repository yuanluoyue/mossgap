// 自定义 Worker 入口：包装 OpenNext 默认 worker，扩展 scheduled() handler
// 用于支持 Cloudflare Cron Triggers，避免 "Handler does not export a scheduled() function" 错误。
//
// 工作原理：
// 1. 复用 OpenNext 生成的 `.open-next/worker.js` 的 fetch handler（处理所有 HTTP 请求）
// 2. 新增 scheduled(event, env, ctx) handler：Cloudflare Cron 触发时调用
// 3. scheduled 内部构造一个 POST /api/cron/cleanup-missions 的 Request，
//    直接传给 OpenNext 的 fetch handler（不经过外网回环），复用已有路由逻辑和鉴权
//
// 触发配置在 wrangler.jsonc 的 `triggers.crons`。
// 鉴权密钥：CRON_SECRET（通过 `wrangler secret put CRON_SECRET` 设置）。

// @ts-expect-error - 由 wrangler 在构建时解析
import openNextWorker from "./.open-next/worker.js";

const CRON_PATH = "/api/cron/cleanup-missions";

/**
 * 构造内部 cron 请求并交给 OpenNext fetch handler 处理。
 *
 * URL host 用 NEXT_PUBLIC_APP_URL（仅用于 Next.js URL 解析，不会真的发起外网请求）。
 * Request 直接传给 OpenNext 内部 fetch handler，由 Next.js 路由分发到
 * /api/cron/cleanup-missions route handler。
 */
async function runCleanupMissions(env, ctx) {
  const base = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const req = new Request(`${base}${CRON_PATH}`, {
    method: "POST",
    headers: {
      "X-Cron-Secret": env.CRON_SECRET ?? "",
      "Content-Type": "application/json",
    },
  });

  try {
    const res = await openNextWorker.fetch(req, env, ctx);
    const text = await res.text();
    console.info(
      `[cron] cleanup-missions status=${res.status} scheduledTime=${new Date().toISOString()} body=${text}`,
    );
  } catch (err) {
    console.error("[cron] cleanup-missions failed", err);
  }
}

export default {
  fetch: openNextWorker.fetch,
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(runCleanupMissions(env, ctx));
  },
};
