import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { getCurrentUserOrNull } from "@/lib/user-session";

export async function SiteHeader() {
  const t = await getTranslations("Nav");
  const user = await getCurrentUserOrNull();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="MossGap"
            width={36}
            height={36}
            className="size-9 rounded-md transition-transform group-hover:scale-105"
            priority
          />
          <span className="font-heading text-lg font-bold tracking-tight">
            Moss<span className="text-primary">Gap</span>
          </span>
        </Link>

        {/* 主导航 */}
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink href="/games">{t("games")}</NavLink>
          <NavLink href="/about">{t("about")}</NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <UserMenu user={user} />
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
