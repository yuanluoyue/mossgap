import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Gamepad2 } from "lucide-react";

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  const tn = await getTranslations("Nav");
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-24 border-t border-white/5 bg-[var(--color-neon-bg)]">
      <div className="neon-grid absolute inset-0 opacity-[0.03] pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="relative flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-[var(--color-neon-cyan)] to-[var(--color-neon-violet)] text-black">
                <Gamepad2 className="size-4" />
              </span>
              <span className="font-heading text-base font-bold tracking-wider text-white">
                MOSS
                <span className="text-[var(--color-neon-cyan)]">GAP</span>
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-white/50">
              {t("tagline")}
            </p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-white/30">
              {t("madeWith")}
            </p>
          </div>

          <nav className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-white/30">
              Navigate
            </span>
            <Link
              href="/"
              className="text-sm text-white/60 transition-colors hover:text-[var(--color-neon-cyan)]"
            >
              {tn("home")}
            </Link>
            <Link
              href="/games"
              className="text-sm text-white/60 transition-colors hover:text-[var(--color-neon-cyan)]"
            >
              {tn("games")}
            </Link>
          </nav>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-white/5 pt-6 text-xs text-white/40 sm:flex-row sm:items-center">
          <p>© {year} MossGap. {t("rights")}</p>
          <p className="font-mono uppercase tracking-widest text-white/30">
            v1.0.0
          </p>
        </div>
      </div>
    </footer>
  );
}
