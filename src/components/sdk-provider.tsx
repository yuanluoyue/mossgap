"use client";

import { useEffect } from "react";
import { analytics, bridge, dispatcher, logger } from "@/sdk";
import { GA_MEASUREMENT_ID } from "@/lib/ga";
import type { AnalyticsMessage, LogMessage } from "@/sdk";

/**
 * SDK Provider：在客户端挂载时初始化 SDK 各模块。
 *
 * 职责：
 * 1. 用 GA4 Measurement ID 初始化 Analytics
 * 2. 启动 Bridge 监听 iframe message
 * 3. 订阅 Dispatcher 的 analytics / log 事件，转发到 Analytics / Logger
 *
 * 放在根 layout 中即可，仅客户端执行，不影响 SSR。
 */
export function SDKProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 1. 初始化 Analytics
    analytics.init(GA_MEASUREMENT_ID);
    logger.info("[SDK] analytics initialized", { id: GA_MEASUREMENT_ID });

    // 2. 启动 Bridge 监听
    const stopBridge = bridge.listen();
    logger.info("[SDK] bridge listening");

    // 3. 订阅 Dispatcher：analytics 消息 → analytics.track
    const offAnalytics = dispatcher.on("analytics", (msg) => {
      const m = msg as AnalyticsMessage;
      analytics.track({
        source: m.source,
        event: m.event,
        payload: m.payload,
      });
    });

    // 4. 订阅 Dispatcher：log 消息 → logger
    const offLog = dispatcher.on("log", (msg) => {
      const m = msg as LogMessage;
      switch (m.level) {
        case "debug":
          logger.debug(m.message, m.data);
          break;
        case "info":
          logger.info(m.message, m.data);
          break;
        case "warn":
          logger.warn(m.message, m.data);
          break;
        case "error":
          logger.error(m.message, m.data);
          break;
      }
    });

    return () => {
      stopBridge();
      offAnalytics();
      offLog();
    };
  }, []);

  return <>{children}</>;
}

