"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, PawPrint, Sparkles } from "lucide-react";

import type { PublicPet, PetGenome, PetStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { formatDateTime } from "@/lib/format";

/** moss pet 兑换价格（与后端常量保持一致，仅用于 UI 文案）。 */
const MOSS_PET_PRICE = 2;

const STATUS_STYLE: Record<PetStatus, string> = {
  NORMAL: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  BREEDING: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  LISTING: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  LOCKED: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
};

const STATUS_I18N_KEY: Record<PetStatus, string> = {
  NORMAL: "statusNormal",
  BREEDING: "statusBreeding",
  LISTING: "statusListing",
  LOCKED: "statusLocked",
};

const GEN_STYLE: Record<number, string> = {
  1: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  2: "bg-purple-500/15 text-purple-600 dark:text-purple-300",
  3: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
};

const BASE_GENE_FIELDS: Array<{ key: keyof PetGenome["genes"]; label: string }> = [
  { key: "body", label: "fieldBody" },
  { key: "eye", label: "fieldEye" },
  { key: "tail", label: "fieldTail" },
  { key: "pattern", label: "fieldPattern" },
  { key: "element", label: "fieldElement" },
  { key: "personality", label: "fieldPersonality" },
];

const EXTRA_GENE_FIELDS: Array<{ key: "aura" | "horn" | "wing"; label: string }> = [
  { key: "aura", label: "fieldAura" },
  { key: "horn", label: "fieldHorn" },
  { key: "wing", label: "fieldWing" },
];

export function PetsSection() {
  const t = useTranslations("Pets");
  const [pets, setPets] = useState<PublicPet[]>([]);
  const [loading, setLoading] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selected, setSelected] = useState<PublicPet | null>(null);

  const fetchPets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/animals", { cache: "no-store" });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { pets: PublicPet[] };
      };
      if (res.ok && json.success && json.data) {
        setPets(json.data.pets);
      }
    } catch {
      // 静默
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => fetchPets());
  }, [fetchPets]);

  async function handleRedeem() {
    setRedeeming(true);
    try {
      const res = await fetch("/api/auth/animals/redeem", { method: "POST" });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { pet: PublicPet; balance: number };
        error?: { code?: string; message?: string };
      };
      if (!res.ok || !json.success) {
        const code = json.error?.code;
        if (code === "ALREADY_REDEEMED") {
          toast.error(t("redeemAlready"));
        } else if (code === "INSUFFICIENT_POINTS") {
          toast.error(t("redeemInsufficient", { price: MOSS_PET_PRICE }));
        } else {
          toast.error(json.error?.message ?? t("redeemFailed"));
        }
        return;
      }
      toast.success(t("redeemSuccess", { price: MOSS_PET_PRICE }));
      // 重新拉取宠物列表
      Promise.resolve().then(() => fetchPets());
    } catch {
      toast.error(t("redeemFailed"));
    } finally {
      setRedeeming(false);
      setConfirmOpen(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PawPrint className="size-5 text-primary" />
              {t("title")}
            </CardTitle>
            <CardDescription className="mt-1">
              {t("description")}
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            className="gap-1.5"
          >
            <Sparkles className="size-4" />
            {t("redeem")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && pets.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            {t("loading")}
          </div>
        ) : pets.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <PawPrint className="size-10 opacity-50" />
            <p>{t("empty")}</p>
            <p className="text-xs">{t("emptyHint")}</p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              {t("count", { count: pets.length })}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {pets.map((pet) => {
                const g = pet.genome;
                const extraCount = g.extraGenes
                  ? EXTRA_GENE_FIELDS.filter((f) => g.extraGenes?.[f.key]).length
                  : 0;
                return (
                  <button
                    key={pet.id}
                    type="button"
                    onClick={() => setSelected(pet)}
                    className="group flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
                          <PawPrint className="size-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {pet.speciesId}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {t("generation", { n: pet.generation })}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          STATUS_STYLE[pet.status] ?? STATUS_STYLE.NORMAL
                        }`}
                      >
                        {t(STATUS_I18N_KEY[pet.status] as never)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px]">
                        {g.genes.body}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {g.genes.eye}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {g.genes.element}
                      </Badge>
                      {extraCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-300">
                          <Sparkles className="size-2.5" />+{extraCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </CardContent>

      {/* 宠物详情弹窗 */}
      <Dialog
        open={selected !== null}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <DialogContent className="max-w-md">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
                    <PawPrint className="size-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-heading text-lg">
                      {selected.speciesId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("generation", { n: selected.generation })}
                    </p>
                  </div>
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {selected.speciesId}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* 状态条 */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                      GEN_STYLE[selected.generation] ?? "bg-muted text-muted-foreground"
                    }`}
                  >
                    {t("generation", { n: selected.generation })}
                  </span>
                  <span
                    className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                      STATUS_STYLE[selected.status] ?? STATUS_STYLE.NORMAL
                    }`}
                  >
                    {t(STATUS_I18N_KEY[selected.status] as never)}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {t("fieldBreedCount")}: {selected.breedCount}
                  </Badge>
                </div>

                {/* 基础基因 */}
                <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("baseGenes")}
                  </p>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    {BASE_GENE_FIELDS.map((f) => (
                      <div key={f.key} className="rounded-md bg-background/60 p-2">
                        <dt className="text-muted-foreground">{t(f.label as never)}</dt>
                        <dd className="mt-0.5 break-all font-medium">
                          {selected.genome.genes[f.key]}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>

                {/* 额外基因 */}
                <div className="space-y-2 rounded-lg border bg-amber-500/5 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("extraGenes")}
                  </p>
                  {EXTRA_GENE_FIELDS.some((f) => selected.genome.extraGenes?.[f.key]) ? (
                    <dl className="grid grid-cols-2 gap-2 text-xs">
                      {EXTRA_GENE_FIELDS.filter(
                        (f) => selected.genome.extraGenes?.[f.key],
                      ).map((f) => (
                        <div key={f.key} className="rounded-md bg-background/60 p-2">
                          <dt className="flex items-center gap-1 text-muted-foreground">
                            <Sparkles className="size-3 text-amber-500" />
                            {t(f.label as never)}
                          </dt>
                          <dd className="mt-0.5 break-all font-medium">
                            {selected.genome.extraGenes?.[f.key]}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t("noExtraGenes")}</p>
                  )}
                </div>

                {/* 元数据 */}
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-muted/50 p-2">
                    <dt className="text-muted-foreground">{t("fieldSpecies")}</dt>
                    <dd className="mt-0.5 font-medium">{selected.speciesId}</dd>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <dt className="text-muted-foreground">{t("fieldStatus")}</dt>
                    <dd className="mt-0.5 font-medium">
                      {t(STATUS_I18N_KEY[selected.status] as never)}
                    </dd>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <dt className="text-muted-foreground">{t("fieldBreedCount")}</dt>
                    <dd className="mt-0.5 font-medium tabular-nums">{selected.breedCount}</dd>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <dt className="text-muted-foreground">{t("fieldCreatedAt")}</dt>
                    <dd className="mt-0.5 font-medium">
                      {formatDateTime(selected.createdAt)}
                    </dd>
                  </div>
                </dl>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* 兑换确认弹窗 */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(v) => {
          if (!redeeming) setConfirmOpen(v);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              {t("redeem")}
            </DialogTitle>
            <DialogDescription>{t("redeemConfirmDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
            <p className="text-muted-foreground">
              {t("redeemConfirmPrice", { price: MOSS_PET_PRICE })}
            </p>
            <p className="text-muted-foreground">{t("redeemConfirmGenes")}</p>
            <p className="text-muted-foreground">{t("redeemConfirmOnce")}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={redeeming}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleRedeem}
              disabled={redeeming}
              className="gap-1.5"
            >
              {redeeming ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {redeeming
                ? t("redeeming")
                : t("redeemConfirm", { price: MOSS_PET_PRICE })}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
