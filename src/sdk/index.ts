/**
 * SDK 统一入口。
 *
 * 架构：
 *   Bridge → Schema → Dispatcher
 *                       ├── Analytics (→ GA4 gtag)
 *                       └── Logger (→ console)
 *
 * 平台侧使用方式：
 *   import { analytics } from "@/sdk";
 *   analytics.platform("button_click", { button: "like" });
 *
 * 游戏侧使用方式（iframe 内）：
 *   import { bridge } from "@/sdk";
 *   bridge.send({
 *     source: "game",
 *     type: "analytics",
 *     event: "level_complete",
 *     payload: { level: 3 },
 *   });
 */

export { logger, Logger } from "./logger";
export type { LogLevel } from "./logger";
export { dispatcher, Dispatcher } from "./dispatcher";
export { analytics, Analytics } from "./analytics";
export { bridge, Bridge } from "./bridge";
export * from "./schema";
