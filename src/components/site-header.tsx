import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const t = await getTranslations("Nav");

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
            <Gamepad2 className="size-5" />
          </span>
          <span className="font-heading text-lg font-bold tracking-tight">
            Moss<span className="text-primary">Gap</span>
          </span>
        </Link>

        {/* 主导航 */}
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink href="/">{t("home")}</NavLink>
          <NavLink href="/games">{t("games")}</NavLink>
          <NavLink href="/about">{t("about")}</NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <Button
            asChild
            size="sm"
            className="btn-press hidden rounded-full px-5 sm:inline-flex"
          >
            <Link href="/games">
              <Gamepad2 className="size-4" />
              {t("games")}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
}: {
  href: "/" | "/games" | "/about";
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {children}
    </Link>
  );
}
