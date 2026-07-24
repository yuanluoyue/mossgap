import Link from "next/link";
import Image from "next/image";

import { HeaderNav } from "@/components/header-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { getCurrentUserOrNull } from "@/lib/user-session";

export async function SiteHeader() {
  const user = await getCurrentUserOrNull();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 sm:px-6 lg:px-10">
        {/* 移动端菜单（< md） */}
        <MobileNav />

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

        {/* 主导航（≥ md） */}
        <HeaderNav />

        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
