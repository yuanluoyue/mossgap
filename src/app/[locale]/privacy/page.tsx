import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Privacy" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Privacy" });
  const year = new Date().getFullYear();

  const sections = [
    { title: t("section1Title"), body: t("section1Body") },
    { title: t("section2Title"), body: t("section2Body") },
    { title: t("section3Title"), body: t("section3Body") },
    { title: t("section4Title"), body: t("section4Body") },
    { title: t("section5Title"), body: t("section5Body") },
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
        {sections.map((s, i) => (
          <section key={i}>
            <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">
              {i + 1}. {s.title}
            </h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-foreground/80">
              {s.body}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
