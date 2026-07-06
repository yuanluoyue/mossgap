"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search, X } from "lucide-react";

import { useTranslations } from "next-intl";
import type { GameCategory } from "@/types";
import { GAME_CATEGORIES } from "@/types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface GamesFilterProps {
  activeCategory: GameCategory | undefined;
  activeSort: "newest" | "popular";
  activeQuery: string | undefined;
}

export function GamesFilter({
  activeCategory,
  activeSort,
  activeQuery,
}: GamesFilterProps) {
  const t = useTranslations("Games");
  const tc = useTranslations("Categories");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params?.toString() ?? "");
    if (value === null || value === "") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    // 翻页时重置 page
    next.delete("page");
    startTransition(() => {
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 搜索框 */}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40" />
        <Input
          type="search"
          defaultValue={activeQuery ?? ""}
          placeholder={t("searchPlaceholder")}
          onChange={(e) => update("q", e.target.value || null)}
          className="border-white/10 bg-white/5 pl-9 pr-9 text-sm text-white placeholder:text-white/40 focus-visible:border-[oklch(from_var(--color-neon-cyan)_l_c_h_/_50%)] focus-visible:ring-[oklch(from_var(--color-neon-cyan)_l_c_h_/_20%)]"
        />
        {activeQuery ? (
          <button
            type="button"
            onClick={() => update("q", null)}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-white/40 hover:text-white"
            aria-label="clear"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {/* 分类标签 */}
      <div className="flex flex-wrap gap-2">
        <CategoryChip
          active={!activeCategory}
          onClick={() => update("category", null)}
        >
          {t("allCategories")}
        </CategoryChip>
        {GAME_CATEGORIES.map((c) => (
          <CategoryChip
            key={c}
            active={activeCategory === c}
            onClick={() => update("category", c)}
          >
            {tc(c)}
          </CategoryChip>
        ))}
      </div>

      {/* 排序 */}
      <div
        className={cn(
          "flex items-center gap-3 transition-opacity",
          isPending && "opacity-60",
        )}
      >
        <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
          Sort
        </span>
        <SortButton
          active={activeSort === "newest"}
          onClick={() => update("sort", "newest")}
        >
          {t("sortNewest")}
        </SortButton>
        <SortButton
          active={activeSort === "popular"}
          onClick={() => update("sort", "popular")}
        >
          {t("sortPopular")}
        </SortButton>
      </div>
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-widest transition-all",
        active
          ? "border-[oklch(from_var(--color-neon-cyan)_l_c_h_/_60%)] bg-[oklch(from_var(--color-neon-cyan)_l_c_h_/_12%)] text-[var(--color-neon-cyan)]"
          : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white/80",
      )}
    >
      {children}
    </button>
  );
}

function SortButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-xs transition-colors",
        active
          ? "bg-white/10 text-white"
          : "text-white/50 hover:text-white/80",
      )}
    >
      {children}
    </button>
  );
}
