"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dices, Loader2, RefreshCw, Search } from "lucide-react";

import type { PetGenome } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UserOption {
  id: string;
  email: string | null;
  name: string | null;
}

const BASE_GENE_LABELS: Record<keyof PetGenome["genes"], string> = {
  body: "身形",
  eye: "眼睛",
  tail: "尾巴",
  pattern: "花纹",
  element: "元素",
  personality: "性格",
};

const EXTRA_GENE_LABELS: Record<string, string> = {
  aura: "光环",
  horn: "角",
  wing: "翅膀",
};

export function RandomAnimalDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [genome, setGenome] = useState<PetGenome | null>(null);

  // 用户搜索
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<UserOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchGenome = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/animals/random-genome", {
        cache: "no-store",
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { genome: PetGenome };
      };
      if (res.ok && json.success && json.data) {
        setGenome(json.data.genome);
      }
    } catch {
      toast.error("生成失败");
    } finally {
      setLoading(false);
    }
  }, []);

  // 打开弹窗时立即生成一份
  useEffect(() => {
    if (open && !genome) {
      Promise.resolve().then(() => fetchGenome());
    }
  }, [open, genome, fetchGenome]);

  // 关闭时重置
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setUserQuery("");
      setUserResults([]);
      setSelectedUser(null);
      setGenome(null);
    }
  }

  // 用户搜索 debounce
  function handleUserSearch(q: string) {
    setUserQuery(q);
    setSelectedUser(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) {
      setUserResults([]);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const url = new URL("/api/admin/c-users", window.location.origin);
        url.searchParams.set("search", q.trim());
        url.searchParams.set("pageSize", "10");
        const res = await fetch(url.toString(), { cache: "no-store" });
        const json = (await res.json()) as {
          success?: boolean;
          data?: {
            items: Array<{
              id: string;
              email: string | null;
              name: string | null;
            }>;
          };
        };
        if (res.ok && json.success && json.data) {
          setUserResults(json.data.items);
        }
      } catch {
        // 静默
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  async function handleSubmit() {
    if (!genome) {
      toast.error("请先生成基因");
      return;
    }
    if (!selectedUser) {
      toast.error("请选择持有者");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/animals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: selectedUser.id,
          speciesId: "moss_pet",
          genome,
          generation: 1,
          breedCount: 0,
          status: "active",
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? "创建失败");
        return;
      }
      toast.success("已随机生成并指派宠物");
      handleOpenChange(false);
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  const extraKeys = genome?.extraGenes
    ? Object.keys(genome.extraGenes).filter(
        (k) => genome.extraGenes?.[k as keyof typeof genome.extraGenes],
      )
    : [];

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Dices className="size-4" />
        随机生成
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dices className="size-5 text-primary" />
              随机生成宠物
            </DialogTitle>
            <DialogDescription>
              随机生成一只第 1 代 moss pet 并指派给指定用户。
            </DialogDescription>
          </DialogHeader>

          {/* 基因预览卡片 */}
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">基因预览</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={fetchGenome}
                disabled={loading}
                className="h-7 gap-1.5"
              >
                {loading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                换一组
              </Button>
            </div>

            {loading && !genome ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : genome ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(BASE_GENE_LABELS) as (keyof PetGenome["genes"])[]).map(
                    (k) => (
                      <div
                        key={k}
                        className="flex items-center gap-1 rounded border bg-background px-2 py-1"
                      >
                        <span className="text-[10px] text-muted-foreground">
                          {BASE_GENE_LABELS[k]}
                        </span>
                        <span className="text-xs font-medium">
                          {genome.genes[k]}
                        </span>
                      </div>
                    ),
                  )}
                </div>
                {extraKeys.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {extraKeys.map((k) => (
                      <Badge
                        key={k}
                        className="bg-amber-500/15 text-amber-600 dark:text-amber-300"
                      >
                        {EXTRA_GENE_LABELS[k] ?? k}:{" "}
                        {genome.extraGenes?.[k as keyof typeof genome.extraGenes]}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">本组无稀有额外基因</p>
                )}
              </div>
            ) : null}
          </div>

          {/* 用户搜索 */}
          <div className="space-y-2">
            <Label>指派给用户</Label>
            {selectedUser ? (
              <div className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {selectedUser.name || "（未命名）"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {selectedUser.email || selectedUser.id.slice(0, 8)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedUser(null);
                    setUserQuery("");
                    setUserResults([]);
                  }}
                  className="h-7"
                >
                  更换
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={userQuery}
                  onChange={(e) => handleUserSearch(e.target.value)}
                  placeholder="搜索邮箱或昵称..."
                  className="pl-9"
                />
                {searching ? (
                  <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : null}
              </div>
            )}
            {!selectedUser && userResults.length > 0 ? (
              <div className="max-h-48 overflow-y-auto rounded-lg border">
                {userResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setSelectedUser(u);
                      setUserResults([]);
                      setUserQuery("");
                    }}
                    className="flex w-full flex-col items-start gap-0.5 border-b px-3 py-2 text-left last:border-b-0 hover:bg-accent"
                  >
                    <span className="text-sm font-medium">
                      {u.name || "（未命名）"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {u.email || u.id.slice(0, 8)}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !genome || !selectedUser}
              className="gap-1.5"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Dices className="size-4" />
              )}
              确认生成并指派
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
