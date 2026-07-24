"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutGrid,
  Settings,
  Coins,
  Target,
  Package,
  PawPrint,
  Egg,
  Loader2,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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

interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/profile", labelKey: "overview", icon: LayoutGrid },
  { href: "/profile/settings", labelKey: "settings", icon: Settings },
  { href: "/profile/points", labelKey: "points", icon: Coins },
  { href: "/profile/missions", labelKey: "missions", icon: Target },
  { href: "/profile/inventory", labelKey: "inventory", icon: Package },
  { href: "/profile/pets", labelKey: "pets", icon: PawPrint },
  { href: "/profile/eggs", labelKey: "eggs", icon: Egg },
];

interface ProfileShellProps {
  user: PublicUser | null;
  children: React.ReactNode;
}

export function ProfileShell({ user: initialUser, children }: ProfileShellProps) {
  const t = useTranslations("ProfileNav");
  const tProfile = useTranslations("Profile");
  const tAuth = useTranslations("Auth");
  const tCommon = useTranslations("Common");
  const pathname = usePathname();

  const [user, setUser] = useState<PublicUser | null>(initialUser);

  // 未登录：客户端探测一次（access token 可能过期但 refresh 还有效）
  // 注意：不能用 router.refresh() 依赖 useState 重新初始化，
  // 因为 React 的 useState 初始值只在首次 mount 时使用，prop 变化不会更新 state。
  // 所以这里直接用 /api/auth/me 返回的 user 数据更新本地 state。
  const [authChecking, setAuthChecking] = useState(!initialUser);

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
            // 直接用接口返回的 user 更新 state，避免依赖 router.refresh()
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

  // 监听 profile-updated 事件（头像/资料更新后同步本地 user）
  useEffect(() => {
    function handleProfileUpdate() {
      fetch("/api/auth/me", { cache: "no-store" })
        .then((r) => r.json() as Promise<{ success?: boolean; data?: { user?: PublicUser } }>)
        .then((json) => {
          if (json.success && json.data?.user) {
            setUser(json.data.user);
          }
        })
        .catch(() => {});
    }
    window.addEventListener("user-profile-updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("user-profile-updated", handleProfileUpdate);
    };
  }, []);

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
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-base font-medium text-foreground">
              {tProfile("loginRequired")}
            </p>
            <p className="text-sm text-muted-foreground">
              {tProfile("loginRequiredHint")}
            </p>
            <Button onClick={handleSignIn} className="gap-1.5">
              <GoogleIcon className="size-4" />
              {tProfile("signIn")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = user.name || user.email || tAuth("anonymous");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 移动端水平导航 */}
      <nav className="mb-6 flex gap-1 overflow-x-auto pb-1 lg:hidden">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/profile"
              ? pathname === "/profile"
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

      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        {/* 桌面端侧边栏 */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            {/* 用户卡片 */}
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Avatar className="size-10">
                {user.avatar ? (
                  <AvatarImage src={user.avatar} alt={displayName} />
                ) : null}
                <AvatarFallback>
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.pointBalance.toLocaleString()} pts
                </p>
              </div>
            </div>

            {/* 导航 */}
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/profile"
                    ? pathname === "/profile"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {t(item.labelKey as never)}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* 主内容区 */}
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
