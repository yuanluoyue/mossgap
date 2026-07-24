"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, Loader2, Pencil } from "lucide-react";

import type { AdminBreedOrder } from "@/types";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BreedMarketActionsProps {
  order: AdminBreedOrder;
}

export function BreedMarketActions({ order }: BreedMarketActionsProps) {
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 改价表单
  const [price, setPrice] = useState<string>(String(order.price));

  const isOpen = order.status === "OPEN";

  async function handleCancel() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/breed-market/${order.id}/cancel`, {
        method: "POST",
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: { code?: string; message?: string };
      };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? "取消失败");
        return;
      }
      toast.success("已取消挂单");
      setCancelOpen(false);
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdatePrice(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(price);
    if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
      toast.error("价格必须为正整数");
      return;
    }
    if (n > 1_000_000) {
      toast.error("价格过高");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/breed-market/${order.id}/price`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: Math.trunc(n) }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: { code?: string; message?: string };
      };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? "改价失败");
        return;
      }
      toast.success("已修改价格");
      setPriceOpen(false);
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <ActionButton
        icon={Pencil}
        label="改价"
        disabled={!isOpen}
        onClick={() => {
          setPrice(String(order.price));
          setPriceOpen(true);
        }}
      />
      <ActionButton
        icon={Ban}
        label="取消挂单"
        variant="destructive"
        disabled={!isOpen}
        onClick={() => setCancelOpen(true)}
      />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="取消挂单"
        description={`确定要取消此挂单吗？宠物 "${order.animalSpeciesId}"（${order.price} 积分）将被下架。此操作不可撤销。`}
        confirmText="确认取消"
        onConfirm={handleCancel}
      />

      <Dialog open={priceOpen} onOpenChange={setPriceOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>修改挂单价格</DialogTitle>
            <DialogDescription>
              修改此挂单的配种价格（积分）。仅影响后续成交价，不改变其他状态。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePrice} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="breed-price">价格（积分）</Label>
              <Input
                id="breed-price"
                type="number"
                min={1}
                step={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                当前价格：{order.price.toLocaleString()} 积分
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPriceOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                {submitting ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
