"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Gift,
  Loader2,
  CalendarCheck,
  Sparkles,
} from "lucide-react";

import type { UserMissionItem, LocalizedText } from "@/db/queries";
import { pickLocalized } from "@/db/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface MissionsSectionProps {
  /** 余额变化回调（签到/领取后通知父组件刷新） */
  onBalanceChange?: (balance: number) => void;
}

export function MissionsSection({
  onBalanceChange,
}: MissionsSectionProps) {
  const t = useTranslations("Mission");
  const locale = useLocale();
  const [missions, setMissions] = useState<UserMissionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const pick = (v: LocalizedText) => pickLocalized(v, locale);

  const fetchMissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/missions", { cache: "no-store" });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { items: UserMissionItem[] };
      };
      if (res.ok && json.success && json.data) {
        setMissions(json.data.items);
      }
    } catch {
      // 静默
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => fetchMissions());
  }, [fetchMissions]);

  // 是否已签到（任一 event=LOGIN 的 daily 任务状态为 claimed）
  const hasCheckedIn = missions.some(
    (m) =>
      m.mission?.event === "LOGIN" &&
      m.mission?.type === "daily" &&
      m.status === "claimed",
  );

  async function handleCheckIn() {
    setCheckingIn(true);
    try {
      const res = await fetch("/api/auth/missions/check-in", {
        method: "POST",
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { balance: number; claimed: { missionId: string; reward: number }[]; updated: number };
        error?: { message?: string };
      };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? t("checkInFailed"));
        return;
      }
      if (json.data) {
        onBalanceChange?.(json.data.balance);
        const totalReward = json.data.claimed.reduce((s, c) => s + c.reward, 0);
        if (totalReward > 0) {
          toast.success(t("checkInSuccess", { reward: totalReward }));
        } else if (json.data.updated > 0) {
          toast.success(t("checkInAlready"));
        } else {
          toast.info(t("checkInAlready"));
        }
      }
      await fetchMissions();
    } catch {
      toast.error(t("checkInFailed"));
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleClaim(userMissionId: string) {
    setClaimingId(userMissionId);
    try {
      const res = await fetch(`/api/auth/missions/${userMissionId}/claim`, {
        method: "POST",
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { balance: number; reward: number };
        error?: { message?: string };
      };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? t("claimFailed"));
        return;
      }
      if (json.data) {
        onBalanceChange?.(json.data.balance);
        toast.success(t("claimSuccess", { reward: json.data.reward }));
      }
      await fetchMissions();
    } catch {
      toast.error(t("claimFailed"));
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              {t("title")}
            </CardTitle>
            <CardDescription className="mt-1">
              {t("description")}
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={handleCheckIn}
            disabled={checkingIn || hasCheckedIn}
            variant={hasCheckedIn ? "secondary" : "default"}
            className="gap-1.5"
          >
            {checkingIn ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CalendarCheck className="size-4" />
            )}
            {hasCheckedIn ? t("checkedIn") : t("checkIn")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && missions.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            {t("loading")}
          </div>
        ) : missions.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {t("empty")}
          </div>
        ) : (
          <ul className="space-y-3">
            {missions.map((um) => {
              const mission = um.mission;
              if (!mission) return null;
              const pct = mission.target > 0
                ? Math.min(100, Math.round((um.progress / mission.target) * 100))
                : 0;
              const canClaim = um.status === "completed";
              const isClaimed = um.status === "claimed";
              return (
                <li
                  key={um.id}
                  className="rounded-lg border p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {pick(mission.name)}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {missionTypeLabel(mission.type, t)}
                        </Badge>
                        {isClaimed ? (
                          <Badge variant="secondary" className="gap-1 text-[10px]">
                            <CheckCircle2 className="size-3" />
                            {t("statusClaimed")}
                          </Badge>
                        ) : canClaim ? (
                          <Badge variant="default" className="gap-1 text-[10px]">
                            <Gift className="size-3" />
                            {t("statusCompleted")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-[10px]">
                            <Circle className="size-3" />
                            {t("statusPending")}
                          </Badge>
                        )}
                      </div>
                      {pick(mission.description) ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {pick(mission.description)}
                        </p>
                      ) : null}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] tabular-nums text-muted-foreground">
                          {um.progress}/{mission.target}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
                        <Gift className="size-3.5" />
                        +{mission.rewardValue}
                      </span>
                      {canClaim ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleClaim(um.id)}
                          disabled={claimingId === um.id}
                          className="h-7 px-2 text-xs"
                        >
                          {claimingId === um.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            t("claim")
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function missionTypeLabel(
  type: string,
  t: ReturnType<typeof useTranslations>,
): string {
  switch (type) {
    case "daily":
      return t("typeDaily");
    case "weekly":
      return t("typeWeekly");
    case "achievement":
      return t("typeAchievement");
    default:
      return type;
  }
}
