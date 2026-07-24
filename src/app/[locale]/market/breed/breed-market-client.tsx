"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Loader2,
  Store,
  PawPrint,
  Sparkles,
  Clock,
  Coins,
  Ban,
  LogIn,
} from "lucide-react";

import type { PublicBreedOrder } from "@/types";
import type { PublicUser } from "@/db/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDateTime } from "@/lib/format";

/** Google "G" 图标。 */
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

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  CLOSED: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  CANCELLED: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
};

const STATUS_I18N_KEY: Record<string, string> = {
  OPEN: "statusOpen",
  CLOSED: "statusClosed",
  CANCELLED: "statusCancelled",
};

const GEN_STYLE: Record<number, string> = {
  1: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  2: "bg-purple-500/15 text-purple-600 dark:text-purple-300",
  3: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
};

const EXTRA_GENE_KEYS: Array<"aura" | "horn" | "wing"> = ["aura", "horn", "wing"];

/** 计算过期剩余时间的人类可读描述。 */
function expiresIn(iso: string | null, now: number): string | null {
  if (!iso) return null;
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return null;
  const diff = ts - now;
  if (diff <= 0) return "expired";
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m`;
}

/** 单张订单卡片。 */
function OrderCard({
  order,
  now,
  onClick,
}: {
  order: PublicBreedOrder;
  now: number;
  onClick: () => void;
}) {
  const t = useTranslations("Market");
  const g = order.animalGenome;
  const extraCount = g.extraGenes
    ? EXTRA_GENE_KEYS.filter((k) => g.extraGenes?.[k]).length
    : 0;
  const remaining = expiresIn(order.expiredAt, now);
  const isExpired = remaining === "expired";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex cursor-pointer flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
            <PawPrint className="size-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {order.animalSpeciesId || "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {t("generation", { n: order.animalGeneration })} ·{" "}
              {order.ownerName ?? t("anonymous")}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
              STATUS_STYLE[order.status] ?? STATUS_STYLE.OPEN
            }`}
          >
            {t(STATUS_I18N_KEY[order.status] as never)}
          </span>
          {order.status === "OPEN" && isExpired && (
            <span className="inline-flex rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-medium text-rose-600 dark:text-rose-300">
              {t("expired")}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[10px]">
          {g.genes.body || "—"}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {g.genes.eye || "—"}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {g.genes.element || "—"}
        </Badge>
        {extraCount > 0 && (
          <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-300">
            <Sparkles className="size-2.5" />+{extraCount}
          </span>
        )}
      </div>

      {order.description ? (
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {order.description}
        </p>
      ) : null}

      <div className="mt-auto flex items-center justify-between border-t pt-2">
        <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          <Coins className="size-3" />
          {order.price.toLocaleString()} {t("priceUnit")}
        </span>
        {order.status === "OPEN" && remaining && !isExpired ? (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <Clock className="size-2.5" />
            {t("expiresIn", { time: remaining })}
          </span>
        ) : null}
      </div>
    </button>
  );
}

/** 订单详情弹窗（市场卡 + 我的挂单卡共用）。 */
function OrderDetailDialog({
  order,
  open,
  onOpenChange,
  isMine,
  onCancel,
  cancelling,
  now,
}: {
  order: PublicBreedOrder | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isMine: boolean;
  onCancel?: () => void;
  cancelling?: boolean;
  now: number;
}) {
  const t = useTranslations("Market");
  if (!order) return null;
  const g = order.animalGenome;
  const extraKeys = EXTRA_GENE_KEYS.filter((k) => g.extraGenes?.[k]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
              <PawPrint className="size-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-heading text-lg">
                {order.animalSpeciesId || "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("generation", { n: order.animalGeneration })}
              </p>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {order.animalSpeciesId}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* 状态条 */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                GEN_STYLE[order.animalGeneration] ?? "bg-muted text-muted-foreground"
              }`}
            >
              {t("generation", { n: order.animalGeneration })}
            </span>
            <span
              className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                STATUS_STYLE[order.status] ?? STATUS_STYLE.OPEN
              }`}
            >
              {t(STATUS_I18N_KEY[order.status] as never)}
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {t("breedCount")}: {order.animalBreedCount}
            </Badge>
            {order.animalCooldownAt &&
            new Date(order.animalCooldownAt).getTime() > now ? (
              <span className="inline-flex items-center gap-1 rounded bg-slate-500/15 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                <Clock className="size-3" />
                {t("cooldownEndsAt", { time: formatDateTime(order.animalCooldownAt) })}
              </span>
            ) : null}
          </div>

          {/* 价格 */}
          <div className="flex items-center justify-between rounded-lg border bg-primary/5 p-3">
            <span className="text-xs text-muted-foreground">{t("price")}</span>
            <span className="inline-flex items-center gap-1.5 text-lg font-bold text-primary">
              <Coins className="size-4" />
              {order.price.toLocaleString()} {t("priceUnit")}
            </span>
          </div>

          {/* 基础基因 */}
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t("baseGenes")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-[10px]">
                {g.genes.body || "—"}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {g.genes.eye || "—"}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {g.genes.tail || "—"}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {g.genes.pattern || "—"}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {g.genes.element || "—"}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {g.genes.personality || "—"}
              </Badge>
            </div>
          </div>

          {/* 额外基因 */}
          {extraKeys.length > 0 ? (
            <div className="space-y-2 rounded-lg border bg-amber-500/5 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                {t("extraGenes")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {extraKeys.map((k) => (
                  <Badge
                    key={k}
                    variant="outline"
                    className="inline-flex items-center gap-1 text-[10px]"
                  >
                    <Sparkles className="size-2.5 text-amber-500" />
                    {g.extraGenes?.[k]}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {/* 留言 */}
          {order.description ? (
            <div className="space-y-1 rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground">
                {t("description")}
              </p>
              <p className="text-sm">{order.description}</p>
            </div>
          ) : null}

          {/* 元数据 */}
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-muted/50 p-2">
              <dt className="text-muted-foreground">{t("seller")}</dt>
              <dd className="mt-0.5 font-medium">
                {isMine ? t("me") : order.ownerName ?? t("anonymous")}
              </dd>
            </div>
            <div className="rounded-md bg-muted/50 p-2">
              <dt className="text-muted-foreground">{t("createdAt")}</dt>
              <dd className="mt-0.5 font-medium">
                {formatDateTime(order.createdAt)}
              </dd>
            </div>
            {order.expiredAt ? (
              <div className="rounded-md bg-muted/50 p-2">
                <dt className="text-muted-foreground">{t("expiredAt")}</dt>
                <dd className="mt-0.5 font-medium">
                  {formatDateTime(order.expiredAt)}
                </dd>
              </div>
            ) : null}
          </dl>

          {/* 我的挂单可取消 */}
          {isMine && order.status === "OPEN" && onCancel ? (
            <div className="flex justify-end gap-2 border-t pt-2">
              <Button
                type="button"
                variant="destructive"
                onClick={onCancel}
                disabled={cancelling}
                className="gap-1.5"
              >
                {cancelling ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Ban className="size-4" />
                )}
                {t("cancel")}
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** 登录提示弹窗（游客点击卡片时弹出）。 */
function LoginPromptDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useTranslations("Market");
  const tAuth = useTranslations("Auth");

  function handleSignIn() {
    const next = window.location.pathname + window.location.search;
    window.location.href = `/api/auth/google?next=${encodeURIComponent(next)}`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <span>{t("signIn")}</span>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {tAuth("signInTerms")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function BreedMarketClient() {
  const t = useTranslations("Market");
  const tCommon = useTranslations("Common");

  const [user, setUser] = useState<PublicUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [marketOrders, setMarketOrders] = useState<PublicBreedOrder[]>([]);
  const [myOrders, setMyOrders] = useState<PublicBreedOrder[]>([]);
  const [loadingMarket, setLoadingMarket] = useState(true);
  const [loadingMine, setLoadingMine] = useState(false);
  const [tab, setTab] = useState<"market" | "mine">("market");

  const [now, setNow] = useState(() => Date.now());

  // 详情弹窗：选中的订单 + 是否为自己的
  const [detailOrder, setDetailOrder] = useState<PublicBreedOrder | null>(null);
  const [detailIsMine, setDetailIsMine] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // 登录提示弹窗
  const [loginOpen, setLoginOpen] = useState(false);

  // 拉取当前用户
  useEffect(() => {
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
        }
      } catch {
        // 静默
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 拉取市场挂单
  const fetchMarket = useCallback(async () => {
    setLoadingMarket(true);
    try {
      const res = await fetch("/api/market/breed", { cache: "no-store" });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { orders: PublicBreedOrder[] };
      };
      if (json.success && json.data) {
        setMarketOrders(json.data.orders);
      }
    } catch {
      // 静默
    } finally {
      setLoadingMarket(false);
    }
  }, []);

  // 拉取我的挂单
  const fetchMine = useCallback(async () => {
    if (!user) {
      setMyOrders([]);
      return;
    }
    setLoadingMine(true);
    try {
      const res = await fetch("/api/market/breed?mine=1", { cache: "no-store" });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { orders: PublicBreedOrder[] };
      };
      if (json.success && json.data) {
        setMyOrders(json.data.orders);
      }
    } catch {
      // 静默
    } finally {
      setLoadingMine(false);
    }
  }, [user]);

  useEffect(() => {
    Promise.resolve().then(() => fetchMarket());
  }, [fetchMarket]);

  // 每分钟刷新 now（用于过期倒计时显示）
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // 切换到"我的挂单"时拉取
  useEffect(() => {
    if (tab === "mine" && user) {
      Promise.resolve().then(() => fetchMine());
    }
  }, [tab, user, fetchMine]);

  // 点击市场卡片
  function handleMarketCardClick(order: PublicBreedOrder) {
    if (!user) {
      // 未登录：弹登录提示
      setLoginOpen(true);
      return;
    }
    // 已登录：展示详情（市场订单不是自己的）
    setDetailOrder(order);
    setDetailIsMine(false);
    setDetailOpen(true);
  }

  // 点击我的挂单卡片
  function handleMyCardClick(order: PublicBreedOrder) {
    setDetailOrder(order);
    setDetailIsMine(true);
    setDetailOpen(true);
  }

  // 取消自己的挂单
  async function handleCancelOrder() {
    if (!detailOrder) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/market/breed/${detailOrder.id}/cancel`, {
        method: "POST",
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: { code?: string; message?: string };
      };
      if (!res.ok || !json.success) {
        const code = json.error?.code;
        const reasonMap: Record<string, string> = {
          NOT_FOUND: t("errPetNotFound"),
          NOT_OWNER: t("errNotOwner"),
          NOT_OPEN: t("errNotOpen"),
        };
        toast.error(reasonMap[code ?? ""] ?? json.error?.message ?? t("cancelFailed"));
        return;
      }
      toast.success(t("cancelSuccess"));
      setDetailOpen(false);
      fetchMine();
    } catch {
      toast.error(t("cancelFailed"));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* 页头 */}
      <header className="mb-8">
        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "market" | "mine")}>
        <TabsList>
          <TabsTrigger value="market">{t("marketTab")}</TabsTrigger>
          <TabsTrigger value="mine">{t("myOrders")}</TabsTrigger>
        </TabsList>

        {/* 市场挂单 */}
        <TabsContent value="market">
          {loadingMarket ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              {tCommon("loading")}
            </div>
          ) : marketOrders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card p-16 text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Store className="size-6" />
              </div>
              <p className="font-heading text-lg text-foreground">{t("empty")}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("emptyHint")}
              </p>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                {t("count", { count: marketOrders.length })}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {marketOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    now={now}
                    onClick={() => handleMarketCardClick(order)}
                  />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* 我的挂单 */}
        <TabsContent value="mine">
          {!authChecked ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              {tCommon("loading")}
            </div>
          ) : !user ? (
            <div className="rounded-3xl border border-dashed border-border bg-card p-16 text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <LogIn className="size-6" />
              </div>
              <p className="font-heading text-lg text-foreground">
                {t("loginRequired")}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("loginRequiredHint")}
              </p>
              <Button
                className="mt-4 gap-1.5"
                onClick={() => {
                  const next = window.location.pathname + window.location.search;
                  window.location.href = `/api/auth/google?next=${encodeURIComponent(next)}`;
                }}
              >
                <GoogleIcon className="size-4" />
                {t("signIn")}
              </Button>
            </div>
          ) : loadingMine ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              {tCommon("loading")}
            </div>
          ) : myOrders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card p-16 text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Store className="size-6" />
              </div>
              <p className="font-heading text-lg text-foreground">{t("myEmpty")}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("myEmptyHint")}
              </p>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                {t("count", { count: myOrders.length })}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {myOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    now={now}
                    onClick={() => handleMyCardClick(order)}
                  />
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* 详情弹窗 */}
      <OrderDetailDialog
        order={detailOrder}
        open={detailOpen}
        onOpenChange={(v) => {
          if (!cancelling) setDetailOpen(v);
        }}
        isMine={detailIsMine}
        onCancel={handleCancelOrder}
        cancelling={cancelling}
        now={now}
      />

      {/* 登录提示弹窗 */}
      <LoginPromptDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
}
