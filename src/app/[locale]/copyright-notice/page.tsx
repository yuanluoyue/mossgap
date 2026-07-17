import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Copyright" });
  return buildPageMetadata({
    title: t("title"),
    description: t("subtitle"),
    path: "/copyright-notice",
    locale,
  });
}

export default async function CopyrightNoticePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Copyright" });
  const year = new Date().getFullYear();

  const requirements = [
    t("req1"),
    t("req2"),
    t("req3"),
    t("req4"),
    t("req5"),
    t("req6"),
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <header>
        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("updated")}: {year}-{String(new Date().getMonth() + 1).padStart(2, "0")}-{String(new Date().getDate()).padStart(2, "0")}
        </p>
        <p className="mt-4 text-base text-muted-foreground">
          {t("subtitle")}
        </p>
      </header>

      <div className="mt-10 space-y-8">
        {/* 介绍 */}
        <section>
          <p className="leading-relaxed text-foreground/80">{t("intro")}</p>
        </section>

        {/* 指定版权代理人 */}
        <section>
          <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">
            {t("agentTitle")}
          </h2>
          <p className="mt-3 leading-relaxed text-foreground/80">
            {t("agentBody")}
          </p>
          <div className="mt-4 rounded-2xl border border-border/60 bg-card p-5 text-sm">
            <p className="font-heading font-semibold text-foreground">
              {t("agentName")}
            </p>
            <p className="mt-0.5 text-muted-foreground">{t("agentOrg")}</p>
            <p className="mt-2">
              <span className="text-muted-foreground">
                {t("agentEmailLabel")}:{" "}
              </span>
              <a
                href="mailto:support@mossgap.com"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                support@mossgap.com
              </a>
            </p>
          </div>
        </section>

        {/* 通知必须包含的信息 */}
        <section>
          <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">
            {t("requirementsTitle")}
          </h2>
          <p className="mt-3 leading-relaxed text-foreground/80">
            {t("requirementsIntro")}
          </p>
          <ol className="mt-4 space-y-3">
            {requirements.map((req, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-xl border border-border/40 bg-secondary/30 p-4 text-sm leading-relaxed text-foreground/80"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <span>{req}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* 善意与准确 */}
        <section>
          <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">
            {t("goodFaithTitle")}
          </h2>
          <p className="mt-3 leading-relaxed text-foreground/80">
            {t("goodFaithBody")}
          </p>
        </section>

        {/* 后续处理 */}
        <section>
          <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">
            {t("responseTitle")}
          </h2>
          <p className="mt-3 leading-relaxed text-foreground/80">
            {t("responseBody")}
          </p>
        </section>
      </div>
    </div>
  );
}
