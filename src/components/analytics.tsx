import { GoogleAnalytics } from "@next/third-parties/google";
import { GA_MEASUREMENT_ID } from "@/lib/ga";

/**
 * Google Analytics 4 基础接入。
 *
 * 使用 @next/third-parties 官方组件（内置 afterInteractive 策略 +
 * partitioned cookies 支持）。后期可扩展为 GoogleTagManager 复杂埋点。
 */
export function Analytics() {
  return <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />;
}
