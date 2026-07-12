import { GoogleAnalytics } from "@next/third-parties/google";
import { GA_MEASUREMENT_ID } from "@/lib/ga";

/**
 * Google Analytics 4 基础接入。
 *
 * 使用 @next/third-parties 官方组件（内置 afterInteractive 策略 +
 * partitioned cookies 支持）。
 *
 * 仅接基本功能（page_view 自动跟踪），不引入额外事件或增强型衡量。
 */
export function Analytics() {
  return <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />;
}
