"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Egg, Heart, Loader2, Sparkles, Clock } from "lucide-react";

import type { PublicEgg, PublicPet, EggStatus, PetGenome } from "@/types";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format";

const EGG_STATUS_STYLE: Record<EggStatus, string> = {
  INCUBATING: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  READY: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  HATCHED: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
};

const EGG_STATUS_I18N: Record<EggStatus, string> = {
  INCUBATING: "eggStatusIncubating",
  READY: "eggStatusReady",
  HATCHED: "eggStatusHatched",
};

const BASE_GENE_FIELDS: Array<{ key: keyof PetGenome["genes"]; label: string }> = [
  { key: "body", label: "fieldBody" },
  { key: "eye", label: "fieldEye" },
  { key: "tail", label: "fieldTail" },
  { key: "pattern", label: "fieldPattern" },
  { key: "element", label: "fieldElement" },
  { key: "personality", label: "fieldPersonality" },
];

/** 判断宠物是否处于繁殖冷却中。 */
function isCoolingDown(pet: { cooldownAt: string | null }, now: number): boolean {
  if (!pet.cooldownAt) return false;
  const cooldownMs = new Date(pet.cooldownAt).getTime();
  return Number.isFinite(cooldownMs) && cooldownMs > now;
}

interface EggsSectionProps {
  /** 可选：外部传入的宠物列表。未传时组件自动拉取。 */
  pets?: PublicPet[];
  /** 宠物列表刷新回调（繁殖后通知外部刷新，可选） */
  onPetsChange?: () => void;
}

export function EggsSection({ pets: externalPets, onPetsChange }: EggsSectionProps) {
  const t = useTranslations("Pets");
  const [eggs, setEggs] = useState<PublicEgg[]>([]);
  const [loading, setLoading] = useState(false);
  const [breedOpen, setBreedOpen] = useState(false);
  const [breeding, setBreeding] = useState(false);
  const [fatherId, setFatherId] = useState("");
  const [motherId, setMotherId] = useState("");
  const [selected, setSelected] = useState<PublicEgg | null>(null);
  const [hatching, setHatching] = useState(false);

  // 内部 pets 状态（当外部未传入时自动拉取）
  const [internalPets, setInternalPets] = useState<PublicPet[]>([]);

  // 当前时间戳，用于冷却判定（避免 render 中调用 Date.now）
  const [now, setNow] = useState(() => Date.now());

  const fetchEggs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/eggs", { cache: "no-store" });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { eggs: PublicEgg[] };
      };
      if (res.ok && json.success && json.data) {
        setEggs(json.data.eggs);
      }
    } catch {
      // 静默
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPets = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/animals", { cache: "no-store" });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { pets: PublicPet[] };
      };
      if (res.ok && json.success && json.data) {
        setInternalPets(json.data.pets);
      }
    } catch {
      // 静默
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => fetchEggs());
    if (!externalPets) {
      Promise.resolve().then(() => fetchPets());
    }
  }, [fetchEggs, fetchPets, externalPets]);

  const pets = externalPets ?? internalPets;

  // 可繁殖宠物：状态 NORMAL（冷却的在选择器里禁用展示，不直接过滤掉，让用户知道为什么不能选）
  const normalPets = pets.filter((p) => p.status === "NORMAL");
  const breedablePets = normalPets.filter((p) => !isCoolingDown(p, now));

  function handleBreedOpenChange(next: boolean) {
    if (next) {
      // 打开弹窗时刷新当前时间，确保冷却判定准确
      setNow(Date.now());
    }
    setBreedOpen(next);
    if (!next) {
      setFatherId("");
      setMotherId("");
    }
  }

  async function handleBreed() {
    if (!fatherId || !motherId) {
      toast.error(t("breedSelectBoth"));
      return;
    }
    if (fatherId === motherId) {
      toast.error(t("breedSamePet"));
      return;
    }
    setBreeding(true);
    try {
      const res = await fetch("/api/auth/animals/breed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fatherId, motherId }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: { code?: string; message?: string };
      };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? t("breedFailed"));
        return;
      }
      toast.success(t("breedSuccess"));
      handleBreedOpenChange(false);
      Promise.resolve().then(() => fetchEggs());
      if (onPetsChange) {
        onPetsChange();
      } else {
        Promise.resolve().then(() => fetchPets());
      }
    } catch {
      toast.error(t("breedFailed"));
    } finally {
      setBreeding(false);
    }
  }

  async function handleHatch() {
    if (!selected) return;
    setHatching(true);
    try {
      const res = await fetch(`/api/auth/eggs/${selected.id}/hatch`, {
        method: "POST",
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { pet: PublicPet };
        error?: { message?: string };
      };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? t("hatchFailed"));
        return;
      }
      toast.success(t("hatchSuccess"));
      setSelected(null);
      Promise.resolve().then(() => fetchEggs());
      if (onPetsChange) {
        onPetsChange();
      } else {
        Promise.resolve().then(() => fetchPets());
      }
    } catch {
      toast.error(t("hatchFailed"));
    } finally {
      setHatching(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Egg className="size-5 text-primary" />
              {t("eggsTitle")}
            </CardTitle>
            <CardDescription className="mt-1">
              {t("eggsDescription")}
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setBreedOpen(true)}
            disabled={breedablePets.length < 2}
            className="gap-1.5"
          >
            <Heart className="size-4" />
            {t("breed")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : eggs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Egg className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("eggsEmpty")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {eggs.map((egg) => {
              const g = egg.genome;
              const extraKeys = g.extraGenes
                ? Object.keys(g.extraGenes).filter(
                    (k) => g.extraGenes?.[k as keyof typeof g.extraGenes],
                  )
                : [];
              return (
                <button
                  key={egg.id}
                  type="button"
                  onClick={() => setSelected(egg)}
                  className="flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {t("generation", { n: egg.generation })}
                    </span>
                    <span
                      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        EGG_STATUS_STYLE[egg.status]
                      }`}
                    >
                      {t(EGG_STATUS_I18N[egg.status] as never)}
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
                    {extraKeys.length > 0 && (
                      <span className="inline-flex items-center rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-300">
                        +{extraKeys.length}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {egg.status === "INCUBATING"
                      ? t("eggFinishesAt", { time: formatDateTime(egg.finishAt) })
                      : egg.status === "READY"
                        ? t("eggReadyToHatch")
                        : t("eggHatched")}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* 繁殖对话框 */}
        <Dialog open={breedOpen} onOpenChange={handleBreedOpenChange}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Heart className="size-5 text-primary" />
                {t("breedTitle")}
              </DialogTitle>
              <DialogDescription>{t("breedDescription")}</DialogDescription>
            </DialogHeader>

            {normalPets.length < 2 ? (
              <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                {t("breedNeedTwo")}
              </p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("breedFather")}
                  </label>
                  <PetSelect
                    pets={normalPets}
                    value={fatherId}
                    onChange={setFatherId}
                    excludeId={motherId}
                    now={now}
                    t={t}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("breedMother")}
                  </label>
                  <PetSelect
                    pets={normalPets}
                    value={motherId}
                    onChange={setMotherId}
                    excludeId={fatherId}
                    now={now}
                    t={t}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("breedRules")}
                </p>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleBreedOpenChange(false)}
                disabled={breeding}
              >
                {t("cancel")}
              </Button>
              <Button
                type="button"
                onClick={handleBreed}
                disabled={breeding || breedablePets.length < 2}
                className="gap-1.5"
              >
                {breeding ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Heart className="size-4" />
                )}
                {t("breedConfirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 蛋详情对话框 */}
        {selected ? (
          <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Egg className="size-5 text-primary" />
                  {t("eggDetail")}
                </DialogTitle>
                <DialogDescription>
                  {t("generation", { n: selected.generation })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                      EGG_STATUS_STYLE[selected.status]
                    }`}
                  >
                    {t(EGG_STATUS_I18N[selected.status] as never)}
                  </span>
                  {selected.status === "INCUBATING" && (
                    <span className="text-xs text-muted-foreground">
                      {t("eggFinishesAt", {
                        time: formatDateTime(selected.finishAt),
                      })}
                    </span>
                  )}
                  {selected.status === "READY" && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-300">
                      {t("eggReadyToHatch")}
                    </span>
                  )}
                  {selected.status === "HATCHED" && selected.createdPetId && (
                    <span className="text-xs text-muted-foreground">
                      {t("eggHatchedPetId", { id: selected.createdPetId.slice(0, 8) })}
                    </span>
                  )}
                </div>

                {/* 基因预览 */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="mb-2 text-sm font-medium">{t("genomePreview")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {BASE_GENE_FIELDS.map((f) => (
                      <div
                        key={f.key}
                        className="flex items-center justify-between rounded border bg-background px-2 py-1"
                      >
                        <span className="text-[10px] text-muted-foreground">
                          {t(f.label as never)}
                        </span>
                        <span className="text-xs font-medium">
                          {selected.genome.genes[f.key]}
                        </span>
                      </div>
                    ))}
                  </div>
                  {selected.genome.extraGenes &&
                    Object.keys(selected.genome.extraGenes).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(selected.genome.extraGenes).map(
                          ([k, v]) =>
                            v ? (
                              <Badge
                                key={k}
                                className="bg-amber-500/15 text-amber-600 dark:text-amber-300"
                              >
                                {k}: {v}
                              </Badge>
                            ) : null,
                        )}
                      </div>
                    )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelected(null)}
                >
                  {t("close")}
                </Button>
                {selected.status === "READY" ? (
                  <Button
                    type="button"
                    onClick={handleHatch}
                    disabled={hatching}
                    className="gap-1.5"
                  >
                    {hatching ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    {t("hatch")}
                  </Button>
                ) : null}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** 宠物选择器（从 NORMAL 列表中选一只，冷却中的禁用展示）。 */
function PetSelect({
  pets,
  value,
  onChange,
  excludeId,
  now,
  t,
}: {
  pets: PublicPet[];
  value: string;
  onChange: (id: string) => void;
  excludeId?: string;
  now: number;
  t: (key: string, values?: Record<string, string | number | Date>) => string;
}) {
  const available = pets.filter((p) => p.id !== excludeId);
  return (
    <div className="grid max-h-60 grid-cols-1 gap-1 overflow-y-auto rounded-lg border p-1">
      {available.length === 0 ? (
        <p className="px-2 py-3 text-center text-xs text-muted-foreground">
          {t("breedNoAvailable")}
        </p>
      ) : (
        available.map((p) => {
          const cooling = isCoolingDown(p, now);
          const selected = value === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                if (!cooling) onChange(p.id);
              }}
              disabled={cooling}
              className={`flex items-center justify-between rounded px-2 py-1.5 text-left text-sm transition-colors ${
                cooling
                  ? "cursor-not-allowed opacity-50"
                  : selected
                    ? "bg-primary/10 ring-1 ring-primary"
                    : "hover:bg-accent"
              }`}
            >
              <span className="font-medium">
                {t("generation", { n: p.generation })}
              </span>
              <div className="flex items-center gap-1">
                {cooling && p.cooldownAt ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <Clock className="size-2.5" />
                    {t("cooldownEndsAt", { time: formatDateTime(p.cooldownAt) })}
                  </span>
                ) : (
                  <>
                    <Badge variant="outline" className="text-[10px]">
                      {p.genome.genes.body}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {p.genome.genes.element}
                    </Badge>
                  </>
                )}
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
