import { GoogleAnalytics } from "@next/third-parties/google";

/**
 * Google Analytics 4 基础接入。
 *
 * 仅在配置了 NEXT_PUBLIC_GA_MEASUREMENT_ID 时加载脚本，
 * 使用 @next/third-parties 官方组件（内置 afterInteractive 策略 +
 * partitioned cookies 支持）。
 *
 * 仅接基本功能（page_view 自动跟踪），不引入额外事件或增强型衡量。
 */
export function Analytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (!measurementId) return null;

  return <GoogleAnalytics gaId={measurementId} />;
}
