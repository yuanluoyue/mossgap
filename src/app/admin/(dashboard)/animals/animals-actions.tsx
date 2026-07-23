"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import type { AdminPet, PetGenome, PetStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionButton } from "@/components/admin/action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "NORMAL", label: "NORMAL（正常）" },
  { value: "BREEDING", label: "BREEDING（繁殖中）" },
  { value: "LISTING", label: "LISTING（挂单中）" },
  { value: "LOCKED", label: "LOCKED（锁定）" },
];

const BASE_GENE_KEYS = ["body", "eye", "tail", "pattern", "element", "personality"] as const;
const EXTRA_GENE_KEYS = ["aura", "horn", "wing"] as const;

function emptyGenome(): PetGenome {
  return {
    version: 1,
    genes: {
      body: "",
      eye: "",
      tail: "",
      pattern: "",
      element: "",
      personality: "",
    },
  };
}

interface AnimalsActionsProps {
  mode: "create" | "edit";
  pet?: AdminPet;
}

export function AnimalsActions({ mode, pet }: AnimalsActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 表单字段
  const [ownerId, setOwnerId] = useState(pet?.ownerId ?? "");
  const [speciesId, setSpeciesId] = useState(pet?.speciesId ?? "moss_pet");
  const [generation, setGeneration] = useState(String(pet?.generation ?? 1));
  const [fatherId, setFatherId] = useState(pet?.fatherId ?? "");
  const [motherId, setMotherId] = useState(pet?.motherId ?? "");
  const [breedCount, setBreedCount] = useState(String(pet?.breedCount ?? 0));
  const [cooldownAt, setCooldownAt] = useState(
    pet?.cooldownAt ? String(Math.floor(new Date(pet.cooldownAt).getTime() / 1000)) : "",
  );
  const [status, setStatus] = useState<PetStatus>(pet?.status ?? "NORMAL");
  const [genome, setGenome] = useState<PetGenome>(pet?.genome ?? emptyGenome());

  function resetForm() {
    setOwnerId(pet?.ownerId ?? "");
    setSpeciesId(pet?.speciesId ?? "moss_pet");
    setGeneration(String(pet?.generation ?? 1));
    setFatherId(pet?.fatherId ?? "");
    setMotherId(pet?.motherId ?? "");
    setBreedCount(String(pet?.breedCount ?? 0));
    setCooldownAt(
      pet?.cooldownAt ? String(Math.floor(new Date(pet.cooldownAt).getTime() / 1000)) : "",
    );
    setStatus(pet?.status ?? "NORMAL");
    setGenome(pet?.genome ?? emptyGenome());
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) resetForm();
  }

  function setGene(key: keyof PetGenome["genes"], value: string) {
    setGenome((g) => ({ ...g, genes: { ...g.genes, [key]: value } }));
  }

  function setExtraGene(key: "aura" | "horn" | "wing", value: string) {
    setGenome((g) => {
      const next: PetGenome = { ...g };
      if (!next.extraGenes) next.extraGenes = {};
      if (value.trim() === "") {
        // 删除该维度；如果额外基因全部为空则整体移除 extraGenes
        const rest = { ...next.extraGenes };
        delete rest[key];
        next.extraGenes = Object.keys(rest).length > 0 ? rest : undefined;
      } else {
        next.extraGenes[key] = value.trim();
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerId.trim()) {
      toast.error("持有者 ID 不能为空");
      return;
    }
    if (!speciesId.trim() || !/^[a-z][a-z0-9_]*$/.test(speciesId.trim())) {
      toast.error("speciesId 只能包含小写字母、数字和下划线，且以字母开头");
      return;
    }
    // 基础基因必须填全
    for (const k of BASE_GENE_KEYS) {
      if (!genome.genes[k].trim()) {
        toast.error(`基础基因 ${k} 不能为空`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const cooldownNum = cooldownAt.trim() ? Number(cooldownAt) : null;
      const payload = {
        ownerId: ownerId.trim(),
        speciesId: speciesId.trim(),
        genome: {
          version: 1,
          genes: {
            body: genome.genes.body.trim(),
            eye: genome.genes.eye.trim(),
            tail: genome.genes.tail.trim(),
            pattern: genome.genes.pattern.trim(),
            element: genome.genes.element.trim(),
            personality: genome.genes.personality.trim(),
          },
          extraGenes: genome.extraGenes,
        },
        generation: Number(generation) || 1,
        fatherId: fatherId.trim() || null,
        motherId: motherId.trim() || null,
        breedCount: Number(breedCount) || 0,
        cooldownAt: cooldownNum != null && Number.isFinite(cooldownNum) ? cooldownNum : null,
        status,
      };

      const url = mode === "create" ? "/api/admin/animals" : `/api/admin/animals/${pet?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? "保存失败");
        return;
      }
      toast.success(mode === "create" ? "已创建宠物" : "已更新宠物");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!pet) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/animals/${pet.id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? "删除失败");
        return;
      }
      toast.success("已删除宠物");
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  const deleteLabel = pet ? `${pet.speciesId} · G${pet.generation}` : "";

  if (mode === "create") {
    return (
      <>
        <Button onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="size-4" />
          新建宠物
        </Button>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>新建宠物</DialogTitle>
              <DialogDescription>
                手动创建宠物。一般由 C 端用户通过积分兑换自动生成，此处仅用于手动发放或测试。
              </DialogDescription>
            </DialogHeader>
            <AnimalForm
              submitting={submitting}
              onSubmit={handleSubmit}
              onCancel={() => setOpen(false)}
              fields={{
                ownerId, speciesId, generation, fatherId, motherId,
                breedCount, cooldownAt, status, genome,
              }}
              setters={{
                setOwnerId, setSpeciesId, setGeneration, setFatherId, setMotherId,
                setBreedCount, setCooldownAt, setStatus, setGenome,
                setGene, setExtraGene,
              }}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <ActionButton icon={Pencil} label="编辑" onClick={() => setOpen(true)} />
      <ActionButton
        icon={Trash2}
        label="删除"
        variant="destructive"
        onClick={() => setDeleteOpen(true)}
      />

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>编辑宠物</DialogTitle>
            <DialogDescription>
              修改宠物元数据和基因。genome 为 JSON 结构，包含 6 个基础基因和可选的 extraGenes。
            </DialogDescription>
          </DialogHeader>
          <AnimalForm
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancel={() => setOpen(false)}
            fields={{
              ownerId, speciesId, generation, fatherId, motherId,
              breedCount, cooldownAt, status, genome,
            }}
            setters={{
              setOwnerId, setSpeciesId, setGeneration, setFatherId, setMotherId,
              setBreedCount, setCooldownAt, setStatus, setGenome,
              setGene, setExtraGene,
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="删除宠物"
        description={`确定要删除宠物 "${deleteLabel}" 吗？此操作不可撤销。`}
        confirmText="删除"
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ─── 表单字段类型 ──────────────────────────────────

interface AnimalFormFields {
  ownerId: string;
  speciesId: string;
  generation: string;
  fatherId: string;
  motherId: string;
  breedCount: string;
  cooldownAt: string;
  status: PetStatus;
  genome: PetGenome;
}

interface AnimalFormSetters {
  setOwnerId: (v: string) => void;
  setSpeciesId: (v: string) => void;
  setGeneration: (v: string) => void;
  setFatherId: (v: string) => void;
  setMotherId: (v: string) => void;
  setBreedCount: (v: string) => void;
  setCooldownAt: (v: string) => void;
  setStatus: (v: PetStatus) => void;
  setGenome: (v: PetGenome) => void;
  setGene: (key: keyof PetGenome["genes"], value: string) => void;
  setExtraGene: (key: "aura" | "horn" | "wing", value: string) => void;
}

interface AnimalFormProps {
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  fields: AnimalFormFields;
  setters: AnimalFormSetters;
}

function AnimalForm({
  submitting,
  onSubmit,
  onCancel,
  fields,
  setters,
}: AnimalFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* ownerId + speciesId */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="animal-owner">持有者 ID *</Label>
          <Input
            id="animal-owner"
            value={fields.ownerId}
            onChange={(e) => setters.setOwnerId(e.target.value)}
            maxLength={64}
            placeholder="user_xxx"
            required
          />
          <p className="text-xs text-muted-foreground">C 端用户 ID（users.id）</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="animal-species">speciesId *</Label>
          <Input
            id="animal-species"
            value={fields.speciesId}
            onChange={(e) => setters.setSpeciesId(e.target.value)}
            maxLength={64}
            placeholder="moss_pet"
            required
          />
          <p className="text-xs text-muted-foreground">
            小写字母、数字、下划线
          </p>
        </div>
      </div>

      {/* generation + status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="animal-gen">代数</Label>
          <Input
            id="animal-gen"
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            value={fields.generation}
            onChange={(e) => setters.setGeneration(e.target.value)}
            placeholder="1"
          />
        </div>
        <div className="space-y-2">
          <Label>状态</Label>
          <Select
            value={fields.status}
            onValueChange={(v) => setters.setStatus(v as PetStatus)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择状态" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4}>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* fatherId + motherId */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="animal-father">父代 ID</Label>
          <Input
            id="animal-father"
            value={fields.fatherId}
            onChange={(e) => setters.setFatherId(e.target.value)}
            maxLength={64}
            placeholder="留空表示初始代"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="animal-mother">母代 ID</Label>
          <Input
            id="animal-mother"
            value={fields.motherId}
            onChange={(e) => setters.setMotherId(e.target.value)}
            maxLength={64}
            placeholder="留空表示初始代"
          />
        </div>
      </div>

      {/* breedCount + cooldownAt */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="animal-breed">繁殖次数</Label>
          <Input
            id="animal-breed"
            type="number"
            inputMode="numeric"
            min={0}
            max={999}
            value={fields.breedCount}
            onChange={(e) => setters.setBreedCount(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="animal-cooldown">冷却时间（Unix 秒）</Label>
          <Input
            id="animal-cooldown"
            type="number"
            inputMode="numeric"
            value={fields.cooldownAt}
            onChange={(e) => setters.setCooldownAt(e.target.value)}
            placeholder="留空表示无冷却"
          />
        </div>
      </div>

      {/* 基础基因（6 维度） */}
      <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
        <Label className="text-sm font-medium">基础基因 *</Label>
        <p className="text-xs text-muted-foreground">
          6 个维度构成宠物基础形态，后期通过 SVG 叠加渲染
        </p>
        <div className="grid grid-cols-3 gap-3">
          {BASE_GENE_KEYS.map((k) => (
            <div key={k} className="space-y-1">
              <Label htmlFor={`gene-${k}`} className="text-xs text-muted-foreground">
                {k}
              </Label>
              <Input
                id={`gene-${k}`}
                value={fields.genome.genes[k]}
                onChange={(e) => setters.setGene(k, e.target.value)}
                maxLength={64}
                placeholder={k === "body" ? "round" : k === "eye" ? "blue_big" : k}
                required
              />
            </div>
          ))}
        </div>
      </div>

      {/* 额外基因（3 维度，可选） */}
      <div className="space-y-2 rounded-lg border bg-amber-500/5 p-3">
        <Label className="text-sm font-medium">额外基因（可选）</Label>
        <p className="text-xs text-muted-foreground">
          稀有附加属性，留空表示该维度不存在。C 端兑换时每个维度 10% 概率随机出现
        </p>
        <div className="grid grid-cols-3 gap-3">
          {EXTRA_GENE_KEYS.map((k) => (
            <div key={k} className="space-y-1">
              <Label htmlFor={`extra-${k}`} className="text-xs text-muted-foreground">
                {k}
              </Label>
              <Input
                id={`extra-${k}`}
                value={fields.genome.extraGenes?.[k] ?? ""}
                onChange={(e) => setters.setExtraGene(k, e.target.value)}
                maxLength={64}
                placeholder={k === "aura" ? "gold" : k === "horn" ? "dragon" : "angel"}
              />
            </div>
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {submitting ? "保存中..." : "保存"}
        </Button>
      </DialogFooter>
    </form>
  );
}
