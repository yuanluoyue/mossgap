import Script from "next/script";

/**
 * Google Tag Manager 容器 ID。
 *
 * GTM ID 不是敏感信息（会出现在前端 HTML 中），直接硬编码避免环境变量开销。
 * 如需切换 ID，修改此处即可。
 *
 * 注意：本项目同时启用了 GA4 直接接入（src/lib/ga.ts，G-Q5JHMJFX1J），
 * GTM 与 GA4 可共存。若后续要改为由 GTM 统一管理 GA4，请同时移除
 * SDKProvider 中的 analytics.init 调用和 src/lib/ga.ts。
 */
export const GTM_CONTAINER_ID = "GTM-W5XLCNZV";

/**
 * GTM 容器代码（head 部分）。
 *
 * 放在 <head> 中，使用 afterInteractive 策略尽早加载 dataLayer。
 * 在 SSR 阶段不阻塞渲染。
 */
export function GoogleTagManagerHead() {
  return (
    <Script id="gtm-head" strategy="afterInteractive">
      {`
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');
      `}
    </Script>
  );
}

/**
 * GTM 容器代码（body noscript 部分）。
 *
 * 放在 <body> 开头，给禁用 JS 的用户兜底加载 GTM iframe。
 */
export function GoogleTagManagerNoScript() {
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="gtm"
      />
    </noscript>
  );
}
