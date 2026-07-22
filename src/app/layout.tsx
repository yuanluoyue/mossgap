import type { Metadata } from "next";
import { getLocale, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { ToasterLazy as Toaster } from "@/components/lazy";
import { Analytics } from "@/components/analytics";
import { SDKProvider } from "@/components/sdk-provider";
import { ThemeProvider } from "@/components/theme-provider";
import {
  GoogleTagManagerHead,
  GoogleTagManagerNoScript,
} from "@/components/gtm";
import { SITE_NAME } from "@/lib/seo";
import { themeInitScript } from "@/lib/theme-init";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} - Play browser games instantly`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "MossGap is a browser game arcade. No downloads, no installs - just hit play.",
};

/**
 * 客户端组件实际通过 useTranslations 使用的 namespace。
 *
 * 其他客户端组件（feedback-dialog、like-button 等）均通过 props 传递文本，
 * 不需要注入 messages。只 pick 必需的 namespace，避免把 FAQ、Privacy、
 * Terms 等大段 i18n 文本打进 client bundle，显著降低首屏 JS 体积。
 */
const CLIENT_NAMESPACES = [
  "Games",
  "Categories",
  "Common",
  "Nav",
  "Auth",
  "Profile",
  "Mission",
  "Inventory",
  "Pets",
] as const;

function pickMessages(
  messages: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in messages) {
      picked[key] = messages[key];
    }
  }
  return picked;
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const clientMessages = pickMessages(messages, CLIENT_NAMESPACES);

  return (
    <html lang={locale} suppressHydrationWarning className="h-full antialiased">
      <head>
        <GoogleTagManagerHead />
        {/*
          前置主题初始化 script：在 next-themes 的 inline script 之前执行，
          提前把主题设置到 <html> 上，避免 FOUC。

          背景：next-themes 0.4.6 在 Next.js 16 Turbopack 构建下，其 inline
          script 被错误 minify，注入了未定义的变量调用（e is not defined），
          导致脚本抛错中断，主题不会被提前应用。这里用独立的前置 script 绕过
          该 bug —— 即使 next-themes 的 script 报错，主题已经设好了。
        */}
        <script
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
          data-theme-init
        />
      </head>
      <body className="min-h-full flex flex-col">
        <GoogleTagManagerNoScript />
        <NextIntlClientProvider locale={locale} messages={clientMessages}>
          <ThemeProvider>
            <SDKProvider>
              {children}
              <Toaster position="top-center" />
              <Analytics />
            </SDKProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
