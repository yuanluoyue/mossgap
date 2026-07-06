import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const t = await getTranslations("Nav");

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[var(--color-neon-bg)]/80 backdrop-blur-xl">
      <div className="neon-grid absolute inset-0 opacity-[0.04] pointer-events-none" />
      <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2.5"
        >
          <span className="relative flex size-8 items-center justify-center rounded-md bg-gradient-to-br from-[var(--color-neon-cyan)] to-[var(--color-neon-violet)] text-black shadow-[0_0_18px_-2px_var(--color-neon-cyan)]">
            <Gamepad2 className="size-5" />
          </span>
          <span className="font-heading text-lg font-bold tracking-wider text-white">
            MOSS
            <span className="text-[var(--color-neon-cyan)]">GAP</span>
          </span>
        </Link>

        {/* 主导航 */}
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink href="/">{t("home")}</NavLink>
          <NavLink href="/games">{t("games")}</NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <Button
            asChild
            variant="default"
            size="sm"
            className="hidden bg-gradient-to-r from-[var(--color-neon-cyan)] to-[var(--color-neon-violet)] text-black hover:opacity-90 sm:inline-flex"
          >
            <Link href="/games">
              <Gamepad2 className="size-3.5" />
              {t("games")}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: "/" | "/games"; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="relative rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-white/60 transition-colors hover:text-white"
    >
      {children}
    </Link>
  );
}
