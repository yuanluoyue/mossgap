import Script from "next/script";

/**
 * Google Analytics 4 基础接入。
 *
 * 仅在配置了 NEXT_PUBLIC_GA_MEASUREMENT_ID 时加载脚本，
 * 使用 afterInteractive 策略不阻塞首屏渲染。
 *
 * 仅接基本功能（page_view 自动跟踪），不引入额外事件或增强型衡量。
 */
export function Analytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (!measurementId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}
