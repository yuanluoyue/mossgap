"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Clock, Gift, LogIn, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** 在线时长档位（分钟），与 seed 中 ONLINE_DURATION 任务的 target 对应 */
const TIERS = [2, 5, 15, 30] as const;

/** API 响应类型 */
interface AuthMeResponse {
  success: boolean;
  data?: { authenticated: boolean };
}
interface ClaimResponse {
  success: boolean;
  data?: { balance: number; reward: number };
  code?: string;
  message?: string;
}

const LS_SECONDS_KEY = "mossgap:online-seconds";
const LS_CLAIMED_KEY = "mossgap:online-claimed-tiers";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function readSeconds(): number {
  try {
    const raw = localStorage.getItem(LS_SECONDS_KEY);
    if (!raw) return 0;
    const data = JSON.parse(raw);
    if (data.date !== todayStr()) return 0;
    return typeof data.seconds === "number" ? data.seconds : 0;
  } catch {
    return 0;
  }
}

function writeSeconds(seconds: number): void {
  try {
    localStorage.setItem(
      LS_SECONDS_KEY,
      JSON.stringify({ date: todayStr(), seconds }),
    );
  } catch {
    // 忽略隐私模式等写入异常
  }
}

function readClaimed(): number[] {
  try {
    const raw = localStorage.getItem(LS_CLAIMED_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (data.date !== todayStr()) return [];
    return Array.isArray(data.tiers) ? data.tiers : [];
  } catch {
    return [];
  }
}

function addClaimed(tier: number): void {
  try {
    const tiers = readClaimed();
    if (!tiers.includes(tier)) tiers.push(tier);
    localStorage.setItem(
      LS_CLAIMED_KEY,
      JSON.stringify({ date: todayStr(), tiers }),
    );
  } catch {
    // 忽略
  }
}

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

/**
 * 全局在线时长追踪器。
 *
 * 在浏览器端统计当天在线秒数（页面可见时累计），达到档位后右下角弹出
 * 小按钮。点击后弹窗领取积分，未登录则弹窗引导登录。
 * 在线时长不写入数据库，仅在 localStorage 按天存储。
 */
export function OnlineDurationTracker() {
  const t = useTranslations("OnlineDuration");
  const tAuth = useTranslations("Auth");

  const [seconds, setSeconds] = useState(0);
  const [claimed, setClaimed] = useState<number[]>([]);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  // 初始化 + 在线时长累计（localStorage 仅在客户端可用，必须延迟到 effect 读取以避免 hydration mismatch）
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setSeconds(readSeconds());
    setClaimed(readClaimed());

    let acc = readSeconds();
    const tick = setInterval(() => {
      if (document.visibilityState === "visible") {
        acc += 1;
        setSeconds(acc);
        if (acc % 5 === 0) writeSeconds(acc);
      }
    }, 1000);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") writeSeconds(acc);
    };
    const onUnload = () => writeSeconds(acc);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onUnload);
      writeSeconds(acc);
    };
  }, []);

  const minutes = Math.floor(seconds / 60);
  const claimable = TIERS.filter(
    (tier) => minutes >= tier && !claimed.includes(tier),
  );
  const topTier = claimable.length > 0 ? claimable[claimable.length - 1] : null;

  async function handleButtonClick() {
    try {
      const res = await fetch("/api/auth/me");
      const json: AuthMeResponse = await res.json();
      if (json.data?.authenticated) {
        setRewardOpen(true);
      } else {
        setLoginOpen(true);
      }
    } catch {
      setLoginOpen(true);
    }
  }

  async function handleClaim(tier: number) {
    setClaiming(tier);
    try {
      const res = await fetch("/api/auth/missions/online-duration/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes: tier }),
      });
      const json: ClaimResponse = await res.json();
      if (json.success && json.data) {
        addClaimed(tier);
        setClaimed((prev) => [...prev, tier]);
        toast.success(t("claimSuccess", { reward: json.data.reward }));
      } else if (json.code === "ALREADY_CLAIMED") {
        addClaimed(tier);
        setClaimed((prev) => [...prev, tier]);
        toast.info(t("alreadyClaimed"));
      } else {
        toast.error(json.message || t("claimFailed"));
      }
    } catch {
      toast.error(t("claimFailed"));
    } finally {
      setClaiming(null);
    }
  }

  function handleSignIn() {
    const next = window.location.pathname + window.location.search;
    window.location.href = `/api/auth/google?next=${encodeURIComponent(next)}`;
  }

  // 服务端渲染时不显示，避免 hydration mismatch；无可领取档位时不显示
  if (!mounted || topTier === null) return null;

  return (
    <>
      {/* 右下角浮动小按钮（黑白风格 + 呼吸动画） */}
      <button
        type="button"
        onClick={handleButtonClick}
        className="fixed bottom-4 right-4 z-50 flex size-12 items-center justify-center rounded-md border-2 border-foreground bg-background text-foreground shadow-lg transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t("rewardAvailable")}
        title={t("rewardAvailable")}
      >
        <Clock className="size-5" />
        {/* 红色徽章（呼吸动画 + 分钟数字） */}
        <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center">
          <span className="absolute size-5 rounded-full bg-red-500 motion-safe:animate-ping" />
          <span className="relative flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {topTier}
          </span>
        </span>
      </button>

      {/* 登录提示弹窗 */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="size-5 text-primary" />
              {t("loginRequired")}
            </DialogTitle>
            <DialogDescription>{t("loginRequiredHint")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-center gap-2"
              onClick={handleSignIn}
            >
              <GoogleIcon className="size-4" />
              <span>{tAuth("signInWithGoogle")}</span>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {tAuth("signInTerms")}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* 领取奖励弹窗 */}
      <Dialog open={rewardOpen} onOpenChange={setRewardOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="size-5 text-primary" />
              {t("claimTitle")}
            </DialogTitle>
            <DialogDescription>{t("claimDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {claimable.map((tier) => (
              <div
                key={tier}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {t("minutes", { count: tier })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-amber-600">
                    +{tier}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleClaim(tier)}
                    disabled={claiming === tier}
                  >
                    {claiming === tier ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      t("claim")
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
