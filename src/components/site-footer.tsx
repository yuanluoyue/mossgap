import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Gamepad2 } from "lucide-react";

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  const tn = await getTranslations("Nav");
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-border bg-background">
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Gamepad2 className="size-4" />
              </span>
              <span className="font-heading text-base font-bold tracking-wider text-foreground">
                MOSS
                <span className="text-primary">GAP</span>
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t("tagline")}
            </p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground/70">
              {t("madeWith")}
            </p>
          </div>

          <nav className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
              Navigate
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
          </nav>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>
            © {year} MossGap. {t("rights")}
          </p>
          <p className="font-mono uppercase tracking-widest text-muted-foreground/70">
            v1.0.0
          </p>
        </div>
      </div>
    </footer>
  );
}
