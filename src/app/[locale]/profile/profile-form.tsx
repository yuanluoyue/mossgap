"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Camera, Coins, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatDateTime } from "@/lib/format";
import type { PublicUser, PointLogItem } from "@/db/queries";
import { MissionsSection } from "./missions-section";
import { InventorySection } from "./inventory-section";
import { PetsSection } from "./pets-section";

interface ProfileFormProps {
  user: PublicUser | null;
}

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

export function ProfileForm({ user: initialUser }: ProfileFormProps) {
  const t = useTranslations("Profile");
  const tAuth = useTranslations("Auth");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<PublicUser | null>(initialUser);
  const [name, setName] = useState(initialUser?.name ?? "");
  const [locale, setLocale] = useState(initialUser?.locale ?? "en");
  const [avatar, setAvatar] = useState(initialUser?.avatar ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // 积分日志
  const [logs, setLogs] = useState<PointLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const logsPageSize = 5;

  const fetchLogs = useCallback(async (page: number) => {
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/auth/points/logs?page=${page}&pageSize=${logsPageSize}`);
      const json = (await res.json()) as {
        success?: boolean;
        data?: { items: PointLogItem[]; total: number };
      };
      if (res.ok && json.success && json.data) {
        setLogs(json.data.items);
        setLogsTotal(json.data.total);
      }
    } catch {
      // 静默失败，不打扰用户
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialUser) {
      Promise.resolve().then(() => fetchLogs(1));
    }
  }, [initialUser, fetchLogs]);

  // 未登录：先客户端探测一次（access token 可能过期但 refresh 还有效），
  // 避免登录态加载慢时卡在登录引导。探测完成前显示 loading，确认未登录才渲染引导。
  const [authChecking, setAuthChecking] = useState(!initialUser);
  useEffect(() => {
    if (!authChecking) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const json = (await res.json()) as {
          success?: boolean;
          data?: { authenticated?: boolean };
        };
        if (cancelled) return;
        if (json.success && json.data?.authenticated) {
          // 实际已登录，触发 SSR 重渲
          router.refresh();
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
  }, [authChecking, router]);

  if (!user) {
    if (authChecking) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
          </CardContent>
        </Card>
      );
    }
    function handleSignIn() {
      const next = window.location.pathname + window.location.search;
      window.location.href = `/api/auth/google?next=${encodeURIComponent(next)}`;
    }
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-base font-medium text-foreground">
            {t("loginRequired")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("loginRequiredHint")}
          </p>
          <Button onClick={handleSignIn} className="gap-1.5">
            <GoogleIcon className="size-4" />
            {t("signIn")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const logsTotalPages = Math.max(1, Math.ceil(logsTotal / logsPageSize));

  function describeChange(log: PointLogItem): string {
    const sign = log.change > 0 ? "+" : "";
    return `${sign}${log.change}`;
  }

  function logTypeLabel(type: string): string {
    switch (type) {
      case "earn":
        return t("pointTypeEarn");
      case "spend":
        return t("pointTypeSpend");
      case "adjust":
        return t("pointTypeAdjust");
      case "revoke":
        return t("pointTypeRevoke");
      default:
        return type;
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || null,
          locale,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { user?: PublicUser };
        error?: { message?: string };
      };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? t("saveFailed"));
        return;
      }
      if (json.data?.user) {
        setUser(json.data.user);
        setAvatar(json.data.user.avatar ?? "");
      }
      toast.success(t("saved"));
      // 通知 header 等组件刷新
      window.dispatchEvent(new Event("user-profile-updated"));
      router.refresh();
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/auth/avatar", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { user?: PublicUser };
        error?: { message?: string };
      };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? t("avatarFailed"));
        return;
      }
      if (json.data?.user) {
        setUser(json.data.user);
        setAvatar(json.data.user.avatar ?? "");
      }
      toast.success(t("avatarUpdated"));
      window.dispatchEvent(new Event("user-profile-updated"));
      router.refresh();
    } catch {
      toast.error(t("avatarFailed"));
    } finally {
      setUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const displayName = user.name || user.email || tAuth("anonymous");

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* 左：账号基本信息 + 头像 + 积分余额 */}
      <div className="space-y-6 lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>{t("basicInfo")}</CardTitle>
            <CardDescription>{t("basicInfoDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
          {/* 头像 */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar size="lg" className="size-20">
                {avatar ? (
                  <AvatarImage src={avatar} alt={displayName} />
                ) : null}
                <AvatarFallback className="text-2xl">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow ring-2 ring-background transition-colors hover:bg-primary/90 disabled:opacity-50"
                aria-label={t("changeAvatar")}
                title={t("changeAvatar")}
              >
                {uploadingAvatar ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Camera className="size-3.5" />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("changeAvatarHint")}
            </p>
          </div>

          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">{t("email")}</dt>
              <dd className="font-medium">{user.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("providers")}</dt>
              <dd className="flex flex-wrap gap-1.5">
                {user.providers.length === 0 ? (
                  <span className="text-muted-foreground">
                    {t("notLinked")}
                  </span>
                ) : (
                  user.providers.map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium capitalize"
                    >
                      {p === "google" ? (
                        <GoogleIcon className="size-3" />
                      ) : null}
                      {p}
                    </span>
                  ))
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("lastLogin")}</dt>
              <dd className="font-medium">
                {user.lastLoginAt
                  ? formatDateTime(user.lastLoginAt)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("createdAt")}</dt>
              <dd className="font-medium">
                {user.createdAt ? formatDate(user.createdAt) : "—"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* 积分余额卡片 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Coins className="size-4 text-amber-500" />
            {t("pointBalance")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold tracking-tight tabular-nums">
            {user.pointBalance.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("pointBalanceHint")}
          </p>
        </CardContent>
      </Card>
      </div>

      {/* 右：资料编辑 + 积分日志 */}
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("editInfo")}</CardTitle>
            <CardDescription>{t("editInfoDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name">{t("nickname")}</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("nickname")}
                  maxLength={64}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email">{t("email")}</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={user.email ?? ""}
                  disabled
                  placeholder="—"
                />
                <p className="text-xs text-muted-foreground">
                  {t("emailReadOnly")}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-locale">{t("language")}</Label>
                <Select value={locale} onValueChange={setLocale}>
                  <SelectTrigger id="profile-locale" className="w-full">
                    <SelectValue placeholder={t("language")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{t("languageEn")}</SelectItem>
                    <SelectItem value="zh">{t("languageZh")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                {saving ? t("saving") : t("save")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 积分日志 */}
        <Card>
          <CardHeader>
            <CardTitle>{t("pointLogs")}</CardTitle>
            <CardDescription>{t("pointLogsHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading && logs.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("pointLogsEmpty")}
              </p>
            ) : (
              <ul className="divide-y">
                {logs.map((log) => {
                  const positive = log.change > 0;
                  return (
                    <li key={log.id} className="flex items-center justify-between py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {logTypeLabel(log.type)}
                          </span>
                          {log.bizType ? (
                            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                              {log.bizType}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDateTime(log.createdAt)}</span>
                          {log.remark ? (
                            <span className="truncate">· {log.remark}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="ml-4 flex flex-col items-end">
                        <span
                          className={`tabular-nums font-semibold ${
                            positive
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-destructive"
                          }`}
                        >
                          {describeChange(log)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {t("pointBalanceAfter")}: {log.balanceAfter.toLocaleString()}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {logsTotalPages > 1 ? (
              <div className="mt-4 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={logsPage <= 1 || logsLoading}
                  onClick={() => {
                    const p = logsPage - 1;
                    setLogsPage(p);
                    Promise.resolve().then(() => fetchLogs(p));
                  }}
                >
                  {t("prev")}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {logsPage} / {logsTotalPages}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={logsPage >= logsTotalPages || logsLoading}
                  onClick={() => {
                    const p = logsPage + 1;
                    setLogsPage(p);
                    Promise.resolve().then(() => fetchLogs(p));
                  }}
                >
                  {t("next")}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* 任务中心 */}
        <MissionsSection
          onBalanceChange={(b) => {
            setUser((prev) =>
              prev ? { ...prev, pointBalance: b } : prev,
            );
            // 余额变动后重新拉日志首页
            Promise.resolve().then(() => fetchLogs(1));
            router.refresh();
          }}
        />

        {/* 我的背包 */}
        <InventorySection />

        {/* 我的宠物 */}
        <PetsSection
          onBalanceChange={(b) => {
            setUser((prev) =>
              prev ? { ...prev, pointBalance: b } : prev,
            );
            Promise.resolve().then(() => fetchLogs(1));
            router.refresh();
          }}
        />
      </div>
    </div>
  );
}
