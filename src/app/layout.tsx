import type { Metadata } from "next";
import { getLocale, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { ToasterLazy as Toaster } from "@/components/lazy";
import { Analytics } from "@/components/analytics";
import { SDKProvider } from "@/components/sdk-provider";
import { SITE_NAME } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} - Play browser games instantly`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "MossGap is a browser game arcade. No downloads, no installs - just hit play.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SDKProvider>
            {children}
            <Toaster position="top-center" />
            <Analytics />
          </SDKProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
