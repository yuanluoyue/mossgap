import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Gamepad2, MessageSquare } from "lucide-react";

import { FeedbackDialog } from "@/components/feedback-dialog";

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  const tn = await getTranslations("Nav");
  const tl = await getTranslations("Legal");
  const tf = await getTranslations("Feedback");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Gamepad2 className="size-4" />
              </span>
              <span className="font-heading text-base font-bold tracking-tight">
                Moss<span className="text-primary">Gap</span>
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t("tagline")}
            </p>
            <p className="mt-2 text-xs text-muted-foreground/80">
              {t("madeWith")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <nav className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                {tl("navigate")}
              </span>
              <Link
                href="/"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                {tn("home")}
              </Link>
              <Link
                href="/games"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                {tn("games")}
              </Link>
              <Link
                href="/about"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                {tn("about")}
              </Link>
            </nav>
            <nav className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                {tl("legal")}
              </span>
              <Link
                href="/privacy"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                {tl("privacy")}
              </Link>
              <Link
                href="/terms"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                {tl("terms")}
              </Link>
              <Link
                href="/contact"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                {tl("contact")}
              </Link>
            </nav>
            <nav className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                {tl("categories")}
              </span>
              <Link
                href="/games?category=action"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                {tn("games")}
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© {year} MossGap. {t("rights")}</p>
          <div className="flex items-center gap-3">
            <FeedbackDialog
              type="platform"
              labels={{
                title: tf("platformTitle"),
                description: tf("platformDescription"),
                contentLabel: tf("contentLabel"),
                contentPlaceholder: tf("contentPlaceholder"),
                contactLabel: tf("contactLabel"),
                contactPlaceholder: tf("contactPlaceholder"),
                submit: tf("submit"),
                submitting: tf("submitting"),
                success: tf("success"),
                error: tf("error"),
              }}
              trigger={
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
                >
                  <MessageSquare className="size-3.5" />
                  {tf("trigger")}
                </button>
              }
            />
            <p className="text-muted-foreground/70">v1.0.0</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
