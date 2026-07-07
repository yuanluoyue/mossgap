import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Gamepad2, Zap, Shield, Sparkles, Globe } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });

  const features = [
    {
      icon: Zap,
      title: t("feature1Title"),
      desc: t("feature1Desc"),
      color: "#f59e0b",
    },
    {
      icon: Shield,
      title: t("feature2Title"),
      desc: t("feature2Desc"),
      color: "#10b981",
    },
    {
      icon: Sparkles,
      title: t("feature3Title"),
      desc: t("feature3Desc"),
      color: "#8b5cf6",
    },
    {
      icon: Globe,
      title: t("feature4Title"),
      desc: t("feature4Desc"),
      color: "#06b6d4",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground card-shadow">
          <Gamepad2 className="size-8" />
        </div>
        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          {t("subtitle")}
        </p>
      </header>

      {/* 使命 */}
      <section className="mt-16">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          {t("missionTitle")}
        </h2>
        <p className="mt-3 leading-relaxed text-foreground/80">
          {t("missionBody")}
        </p>
      </section>

      {/* 特性 */}
      <section className="mt-12 grid gap-5 sm:grid-cols-2">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-border/60 bg-card p-6 card-shadow"
          >
            <div
              className="mb-4 flex size-11 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${f.color}20`, color: f.color }}
            >
              <f.icon className="size-5" />
            </div>
            <h3 className="font-heading text-lg font-semibold text-foreground">
              {f.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {f.desc}
            </p>
          </div>
        ))}
      </section>

      {/* 故事 */}
      <section className="mt-12 rounded-3xl border border-border/60 bg-card p-8 card-shadow">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          {t("storyTitle")}
        </h2>
        <p className="mt-3 leading-relaxed text-foreground/80">
          {t("storyBody")}
        </p>
      </section>
    </div>
  );
}
