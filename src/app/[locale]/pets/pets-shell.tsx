"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { PawPrint, Egg, Loader2, Sparkles, Heart, Store, Coins } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PublicUser } from "@/db/queries";

/** Google "G" 图标（与 user-menu 一致）。 */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

interface PetsShellProps {
  user: PublicUser | null;
  children: React.ReactNode;
}

export function PetsShell({ user: initialUser, children }: PetsShellProps) {
  const t = useTranslations("ProfileNav");
  const tProfile = useTranslations("Profile");
  const tCommon = useTranslations("Common");
  const tPets = useTranslations("Pets");
  const pathname = usePathname();

  const [user, setUser] = useState<PublicUser | null>(initialUser);
  const [authChecking, setAuthChecking] = useState(!initialUser);

  // 未登录：客户端探测一次（access token 可能过期但 refresh 还有效）
  useEffect(() => {
    if (!initialUser && authChecking) {
      let cancelled = false;
      (async () => {
        try {
          const res = await fetch("/api/auth/me", { cache: "no-store" });
          const json = (await res.json()) as {
            success?: boolean;
            data?: { authenticated?: boolean; user?: PublicUser };
          };
          if (cancelled) return;
          if (json.success && json.data?.authenticated && json.data.user) {
            setUser(json.data.user);
            setAuthChecking(false);
            return;
          }
          setAuthChecking(false);
        } catch {
          if (!cancelled) setAuthChecking(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [initialUser, authChecking]);

  if (!user) {
    if (authChecking) {
      return (
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    function handleSignIn() {
      const next = window.location.pathname + window.location.search;
      window.location.href = `/api/auth/google?next=${encodeURIComponent(next)}`;
    }

    const features = [
      { icon: Sparkles, title: tPets("introFeature1Title"), desc: tPets("introFeature1Desc") },
      { icon: Heart, title: tPets("introFeature2Title"), desc: tPets("introFeature2Desc") },
      { icon: Store, title: tPets("introFeature3Title"), desc: tPets("introFeature3Desc") },
      { icon: Coins, title: tPets("introFeature4Title"), desc: tPets("introFeature4Desc") },
    ];

    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Hero 宣传区 */}
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
            <PawPrint className="size-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              {tPets("introTitle")}
            </h1>
            <p className="mx-auto max-w-xl text-sm text-muted-foreground sm:text-base">
              {tPets("introSubtitle")}
            </p>
          </div>
        </div>

        {/* 特性卡片网格 */}
        <div className="my-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="h-full">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 登录提示 + 按钮 */}
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">{tPets("introCtaHint")}</p>
            <Button onClick={handleSignIn} className="gap-1.5">
              <GoogleIcon className="size-4" />
              {tProfile("signIn")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 子导航：宠物 / 蛋
  const subNav = [
    { href: "/pets", labelKey: "pets", icon: PawPrint },
    { href: "/pets/eggs", labelKey: "eggs", icon: Egg },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 子导航（水平，移动端可滚动） */}
      <nav className="mb-6 flex gap-1 overflow-x-auto pb-1">
        {subNav.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/pets"
              ? pathname === "/pets"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {t(item.labelKey as never)}
            </Link>
          );
        })}
      </nav>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
