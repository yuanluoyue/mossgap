import { AnalyticsEventSchema, type AnalyticsEvent } from "./schema";
import { logger } from "./logger";

/**
 * 平台级 gtag 声明。
 * `@next/third-parties/google` 的 GoogleAnalytics 组件会注入 `window.gtag`。
 */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * SDK Analytics 模块。
 *
 * 统一埋点入口：
 * - source="platform"：平台自身交互（如工具栏按钮点击）
 * - source="game"：游戏通过 Bridge 上报的事件
 *
 * 所有事件先经过 Zod 校验，再调用 `window.gtag("event", ...)` 发送到 GA4。
 */

export class Analytics {
  private measurementId: string | null = null;

  /** 获取 Measurement ID（供外部读取） */
  getMeasurementId(): string | null {
    return this.measurementId;
  }

  /** 初始化，传入 GA4 Measurement ID */
  init(measurementId: string): void {
    this.measurementId = measurementId;
  }

  /** 是否已启用（配置了 Measurement ID 且 gtag 可用） */
  private get enabled(): boolean {
    return (
      !!this.measurementId &&
      typeof window !== "undefined" &&
      typeof window.gtag === "function"
    );
  }

  /**
   * 发送埋点事件。
   * 任何模块都通过此方法上报，会自动 Zod 校验后转发到 GA4。
   */
  track(event: AnalyticsEvent): void {
    const result = AnalyticsEventSchema.safeParse(event);
    if (!result.success) {
      logger.warn("[Analytics] invalid event, dropped", {
        event,
        issues: result.error.issues,
      });
      return;
    }

    const { source, event: eventName, payload } = result.data;
    logger.debug("[Analytics] track", { source, event: eventName, payload });

    if (!this.enabled) {
      // 未启用时只记日志，不报错（本地开发常见）
      return;
    }

    try {
      const params: Record<string, unknown> = { source };
      if (payload && typeof payload === "object") {
        Object.assign(params, payload as Record<string, unknown>);
      }
      window.gtag!("event", eventName, params);
    } catch (err) {
      logger.error("[Analytics] gtag failed", err);
    }
  }

  /** 平台事件快捷方法 */
  platform(event: string, payload?: unknown): void {
    this.track({ source: "platform", event, payload });
  }

  /** 游戏事件快捷方法 */
  game(event: string, payload?: unknown): void {
    this.track({ source: "game", event, payload });
  }
}

/** 默认 Analytics 实例 */
export const analytics = new Analytics();
