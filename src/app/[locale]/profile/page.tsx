import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Coins,
  Package,
  Settings,
  Target,
  type LucideIcon,
} from "lucide-react";

import { buildPageMetadata } from "@/lib/seo";
import { getCurrentUserOrNull } from "@/lib/user-session";
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
import { formatDate, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Profile" });
  return buildPageMetadata({
    title: t("title"),
    description: t("subtitle"),
    path: "/profile",
    locale,
    type: "profile",
  });
}

interface NavCard {
  href: string;
  labelKey: string;
  descKey: string;
  icon: LucideIcon;
}

const NAV_CARDS: NavCard[] = [
  { href: "/profile/settings", labelKey: "settings", descKey: "settingsDesc", icon: Settings },
  { href: "/profile/points", labelKey: "points", descKey: "pointsDesc", icon: Coins },
  { href: "/profile/missions", labelKey: "missions", descKey: "missionsDesc", icon: Target },
  { href: "/profile/inventory", labelKey: "inventory", descKey: "inventoryDesc", icon: Package },
];

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Profile" });
  const tNav = await getTranslations({ locale, namespace: "ProfileNav" });
  const tAuth = await getTranslations({ locale, namespace: "Auth" });

  const user = await getCurrentUserOrNull();

  if (!user) return null;

  const displayName = user.name || user.email || tAuth("anonymous");

  return (
    <div className="space-y-6">
      {/* 用户概览卡片 */}
      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <Avatar className="size-16 shrink-0">
            {user.avatar ? (
              <AvatarImage src={user.avatar} alt={displayName} />
            ) : null}
            <AvatarFallback className="text-2xl">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="font-heading text-xl font-bold tracking-tight">
              {displayName}
            </h1>
            <p className="truncate text-sm text-muted-foreground">
              {user.email || "—"}
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {user.lastLoginAt ? (
                <span>{t("lastLogin")}: {formatDateTime(user.lastLoginAt)}</span>
              ) : null}
              {user.createdAt ? (
                <span>{t("createdAt")}: {formatDate(user.createdAt)}</span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-center rounded-lg border bg-muted/30 px-6 py-3">
            <span className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {user.pointBalance.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">{t("pointBalance")}</span>
          </div>
        </CardContent>
      </Card>

      {/* 导航卡片网格 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {NAV_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href}>
              <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/40">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">
                    {tNav(card.labelKey as never)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs">
                    {tNav(card.descKey as never)}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
