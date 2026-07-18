"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogOut, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PublicUser } from "@/db/queries";

interface UserMenuProps {
  /** 服务端预取的用户；为 null 表示未登录（仍会客户端轮询 /me 修正登录态）。 */
  user: PublicUser | null;
}

/** Google "G" 图标（SVG，符合 Google brand guideline）。 */
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

export function UserMenu({ user: initialUser }: UserMenuProps) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(initialUser);
  const [signInOpen, setSignInOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  // 客户端轮询 /me 修正登录态（覆盖 SSR 未渲染到的情况，如刚登录完跳回）
  const refreshMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { authenticated?: boolean; user?: PublicUser };
      };
      if (json.success && json.data?.authenticated && json.data.user) {
        setUser(json.data.user);
      } else {
        setUser(null);
      }
    } catch {
      // 静默失败
    }
  }, []);

  useEffect(() => {
    // SSR 已提供 user 时无需立即再查
    if (!initialUser) {
      // 延迟到 microtask 避免在 effect 同步上下文中调用 setState
      Promise.resolve().then(() => refreshMe());
    }
    // 监听 profile 更新事件
    const handler = () => refreshMe();
    window.addEventListener("user-profile-updated", handler);
    return () => window.removeEventListener("user-profile-updated", handler);
  }, [initialUser, refreshMe]);

  function handleGoogleSignIn() {
    setSigningIn(true);
    // 跳转到 Google OAuth，登录后回到当前页（next 参数）
    const next = window.location.pathname + window.location.search;
    window.location.href = `/api/auth/google?next=${encodeURIComponent(next)}`;
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      toast.success(t("loggedOut"));
      router.refresh();
    } catch {
      toast.error(t("logoutFailed"));
    }
  }

  // 未登录：显示 User icon 按钮，点击弹出登录方式选择 Dialog
  if (!user) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setSignInOpen(true)}
          aria-label={t("signIn")}
          title={t("signIn")}
        >
          <UserIcon className="size-4" />
        </Button>

        <Dialog open={signInOpen} onOpenChange={setSignInOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t("signInTitle")}</DialogTitle>
              <DialogDescription>{t("signInDesc")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-center gap-2"
                onClick={handleGoogleSignIn}
                disabled={signingIn}
              >
                <GoogleIcon className="size-4" />
                <span>{t("signInWithGoogle")}</span>
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {t("signInTerms")}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  const displayName = user.name || user.email || t("anonymous");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full p-0.5 pr-2 text-sm font-medium transition-colors hover:bg-secondary"
          aria-label={t("account")}
        >
          <Avatar size="sm">
            {user.avatar ? (
              <AvatarImage src={user.avatar} alt={displayName} />
            ) : null}
            <AvatarFallback>
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[100px] truncate sm:inline">
            {displayName}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5">
            <span className="truncate font-medium">{displayName}</span>
            {user.email && (
              <span className="truncate text-xs font-normal text-muted-foreground">
                {user.email}
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserIcon className="mr-2 size-4" />
            {t("profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} variant="destructive">
          <LogOut className="mr-2 size-4" />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
