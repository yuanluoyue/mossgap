"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, Package, PackageOpen } from "lucide-react";

import type { UserInventoryItem, LocalizedText } from "@/db/queries";
import { pickLocalized } from "@/db/queries";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const RARITY_RING: Record<string, string> = {
  common: "ring-slate-300 dark:ring-slate-600",
  rare: "ring-blue-400 dark:ring-blue-500",
  epic: "ring-purple-400 dark:ring-purple-500",
  legendary: "ring-amber-400 dark:ring-amber-500",
};

const RARITY_LABEL_KEY: Record<string, string> = {
  common: "rarityCommon",
  rare: "rarityRare",
  epic: "rarityEpic",
  legendary: "rarityLegendary",
};

const TYPE_LABEL_KEY: Record<string, string> = {
  consumable: "typeConsumable",
  material: "typeMaterial",
  gift: "typeGift",
  currency: "typeCurrency",
  equipment: "typeEquipment",
};

export function InventorySection() {
  const t = useTranslations("Inventory");
  const locale = useLocale();
  const [items, setItems] = useState<UserInventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<UserInventoryItem | null>(null);

  const pick = (v: LocalizedText) => pickLocalized(v, locale);

  /** 翻译标签：按 key 取，找不到 key 时返回原始 fallback。 */
  function labelOf(keyMap: Record<string, string>, value: string, fallback: string): string {
    const key = keyMap[value];
    if (!key) return fallback;
    try {
      const translated = t(key as never);
      return translated || fallback;
    } catch {
      return fallback;
    }
  }

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/inventory", { cache: "no-store" });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { items: UserInventoryItem[] };
      };
      if (res.ok && json.success && json.data) {
        setItems(json.data.items);
      }
    } catch {
      // 静默
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => fetchInventory());
  }, [fetchInventory]);

  const totalKinds = items.length;
  const totalQty = items.reduce((s, it) => s + it.quantity, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="size-5 text-primary" />
              {t("title")}
            </CardTitle>
            <CardDescription className="mt-1">
              {t("description")}
            </CardDescription>
          </div>
          {totalKinds > 0 ? (
            <div className="text-right text-xs text-muted-foreground">
              <div className="font-semibold text-foreground tabular-nums">
                {totalKinds} {t("kinds")}
              </div>
              <div className="tabular-nums">
                {totalQty.toLocaleString()} {t("total")}
              </div>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            {t("loading")}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <PackageOpen className="size-10 opacity-50" />
            <p>{t("empty")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {items.map((it) => {
              const item = it.item;
              if (!item) return null;
              const ringClass = RARITY_RING[item.rarity] ?? RARITY_RING.common;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => setSelected(it)}
                  className="group relative flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center transition-colors hover:border-primary/40 hover:bg-accent/40"
                  aria-label={pick(item.name)}
                >
                  <div
                    className={`relative flex size-14 items-center justify-center overflow-hidden rounded-lg bg-muted ring-2 ${
                      ringClass
                    }`}
                  >
                    {item.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.icon}
                        alt={pick(item.name)}
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Package className="size-6 text-muted-foreground" />
                    )}
                  </div>
                  {it.quantity > 1 ? (
                    <span className="absolute top-1 right-1 rounded-full bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums shadow-sm ring-1 ring-border">
                      ×{it.quantity.toLocaleString()}
                    </span>
                  ) : null}
                  <p className="line-clamp-1 w-full text-xs font-medium">
                    {pick(item.name)}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* 物品详情弹窗 */}
      <Dialog
        open={selected !== null}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <DialogContent className="max-w-md">
          {selected?.item ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div
                    className={`flex size-12 items-center justify-center overflow-hidden rounded-lg bg-muted ring-2 ${
                      RARITY_RING[selected.item.rarity] ?? RARITY_RING.common
                    }`}
                  >
                    {selected.item.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selected.item.icon}
                        alt={pick(selected.item.name)}
                        className="size-full object-cover"
                      />
                    ) : (
                      <Package className="size-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-heading text-lg">
                      {pick(selected.item.name)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {pick(selected.item.name) !== pickLocalized(selected.item.name, locale === "zh" ? "en" : "zh")
                        ? pickLocalized(selected.item.name, locale === "zh" ? "en" : "zh")
                        : selected.item.code}
                    </p>
                  </div>
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {pick(selected.item.name)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* 标签 */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {labelOf(TYPE_LABEL_KEY, selected.item.type, selected.item.type)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px]"
                  >
                    {labelOf(RARITY_LABEL_KEY, selected.item.rarity, selected.item.rarity)}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {selected.item.code}
                  </Badge>
                  <Badge variant="default" className="text-[10px]">
                    ×{selected.quantity.toLocaleString()}
                  </Badge>
                </div>

                {/* 描述 */}
                {pick(selected.item.description) ? (
                  <p className="text-sm text-foreground">
                    {pick(selected.item.description)}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t("noDescription")}
                  </p>
                )}

                {/* 属性 */}
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-muted/50 p-2">
                    <dt className="text-muted-foreground">{t("fieldType")}</dt>
                    <dd className="mt-0.5 font-medium">{selected.item.type}</dd>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <dt className="text-muted-foreground">{t("fieldRarity")}</dt>
                    <dd className="mt-0.5 font-medium">{selected.item.rarity}</dd>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <dt className="text-muted-foreground">{t("fieldStackable")}</dt>
                    <dd className="mt-0.5 font-medium">
                      {selected.item.stackable
                        ? t("yes")
                        : t("no")}
                    </dd>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <dt className="text-muted-foreground">{t("fieldQuantity")}</dt>
                    <dd className="mt-0.5 font-medium tabular-nums">
                      {selected.quantity.toLocaleString()}
                    </dd>
                  </div>
                </dl>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
