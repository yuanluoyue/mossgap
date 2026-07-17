import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Mail } from "lucide-react";

import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Contact" });
  return buildPageMetadata({
    title: t("title"),
    description: t("subtitle"),
    path: "/contact",
    locale,
  });
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Contact" });

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="text-center">
        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
          {t("subtitle")}
        </p>
      </header>

      <div className="mt-12 space-y-4">
        <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">
          {t("channelsTitle")}
        </h2>

        {/* 邮箱渠道：目前唯一的联系方式 */}
        <a
          href="mailto:support@mossgap.com"
          className="card-hover flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-5 card-shadow"
        >
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "#7c3aed20", color: "#7c3aed" }}
          >
            <Mail className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              {t("emailLabel")}
            </p>
            <p className="truncate text-sm font-semibold text-foreground">
              support@mossgap.com
            </p>
          </div>
        </a>

        <div className="rounded-2xl border border-border/60 bg-secondary/40 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("responseTimeLabel")}
          </p>
          <p className="mt-1 text-sm text-foreground">
            {t("responseTimeValue")}
          </p>
        </div>
      </div>
    </div>
  );
}
