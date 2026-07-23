"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Camera, Loader2, Save } from "lucide-react";
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

export function SettingsForm({ user: initialUser }: { user: PublicUser }) {
  const t = useTranslations("Profile");
  const tAuth = useTranslations("Auth");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<PublicUser>(initialUser);
  const [name, setName] = useState(initialUser.name ?? "");
  const [locale, setLocale] = useState(initialUser.locale ?? "en");
  const [avatar, setAvatar] = useState(initialUser.avatar ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
      {/* 左：账号基本信息 + 头像 */}
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
      </div>

      {/* 右：资料编辑 */}
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
      </div>
    </div>
  );
}
