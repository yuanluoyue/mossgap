import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Mail } from "lucide-react";

import { buildPageMetadata } from "@/lib/seo";
import { ContactForm } from "./contact-form";

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

  const channels = [
    {
      icon: Mail,
      label: t("emailLabel"),
      value: "hello@mossgap.com",
      href: "mailto:hello@mossgap.com",
      color: "#7c3aed",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="text-center">
        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          {t("subtitle")}
        </p>
      </header>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        {/* 联系渠道 */}
        <div className="space-y-4">
          <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">
            {t("channelsTitle")}
          </h2>
          {channels.map((c) => (
            <a
              key={c.label}
              href={c.href}
              className="card-hover flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 card-shadow"
            >
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${c.color}20`, color: c.color }}
              >
                <c.icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  {c.label}
                </p>
                <p className="truncate text-sm font-semibold text-foreground">
                  {c.value}
                </p>
              </div>
            </a>
          ))}

          <div className="rounded-2xl border border-border/60 bg-secondary/40 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("responseTimeLabel")}
            </p>
            <p className="mt-1 text-sm text-foreground">
              {t("responseTimeValue")}
            </p>
          </div>
        </div>

        {/* 联系表单 */}
        <div className="rounded-3xl border border-border/60 bg-card p-6 card-shadow sm:p-8">
          <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">
            {t("formTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("formSubtitle")}
          </p>
          <ContactForm
            labels={{
              name: t("formName"),
              email: t("formEmail"),
              subject: t("formSubject"),
              message: t("formMessage"),
              submit: t("formSubmit"),
              submitting: t("formSubmitting"),
              success: t("formSuccess"),
              error: t("formError"),
            }}
          />
        </div>
      </div>
    </div>
  );
}
