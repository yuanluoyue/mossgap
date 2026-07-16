import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

import { FeedbackDialogLazy as FeedbackDialog } from "@/components/lazy";

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  const tn = await getTranslations("Nav");
  const tl = await getTranslations("Legal");
  const tf = await getTranslations("Feedback");
  const year = new Date().getFullYear();

  const feedbackLabels = {
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
  };

  return (
    <footer className="relative border-t border-border bg-background">
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="MossGap" className="size-7 rounded-md" />
              <span className="font-heading text-base font-bold tracking-wider text-foreground">
                MOSS
                <span className="text-primary">GAP</span>
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t("tagline")}
            </p>
          </div>

          <div className="flex flex-col gap-6 sm:flex-row sm:gap-12">
            <nav className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
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
              <Link
                href="/contact"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                {tl("contact")}
              </Link>
            </nav>

            <nav className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
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
              <FeedbackDialog
                type="platform"
                labels={feedbackLabels}
                trigger={
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    <MessageSquare className="size-3.5" />
                    {tf("trigger")}
                  </button>
                }
              />
            </nav>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>
            © {year} MossGap. {t("rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
