"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search, X } from "lucide-react";

import { useTranslations } from "next-intl";
import type { GameCategory } from "@/types";
import { GAME_CATEGORIES, CATEGORY_COLORS } from "@/types";
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
    <div className="flex flex-col gap-5">
      {/* 搜索框 */}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          defaultValue={activeQuery ?? ""}
          placeholder={t("searchPlaceholder")}
          onChange={(e) => update("q", e.target.value || null)}
          className="h-12 rounded-full border-border bg-card pl-11 pr-11 text-sm shadow-sm focus-visible:border-primary focus-visible:ring-primary/20"
        />
        {activeQuery ? (
          <button
            type="button"
            onClick={() => update("q", null)}
            className="absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="clear"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {/* 分类标签 */}
      <div className="flex flex-wrap gap-2">
        <CategoryChip active={!activeCategory} onClick={() => update("category", null)}>
          {t("allCategories")}
        </CategoryChip>
        {GAME_CATEGORIES.map((c) => (
          <CategoryChip
            key={c}
            active={activeCategory === c}
            accent={CATEGORY_COLORS[c]}
            onClick={() => update("category", c)}
          >
            {tc(c)}
          </CategoryChip>
        ))}
      </div>

      {/* 排序 */}
      <div
        className={cn(
          "flex items-center gap-2 transition-opacity",
          isPending && "opacity-60",
        )}
      >
        <span className="text-xs font-medium text-muted-foreground">
          {t("sortLabel")}
        </span>
        <SortButton active={activeSort === "newest"} onClick={() => update("sort", "newest")}>
          {t("sortNewest")}
        </SortButton>
        <SortButton active={activeSort === "popular"} onClick={() => update("sort", "popular")}>
          {t("sortPopular")}
        </SortButton>
      </div>
    </div>
  );
}

function CategoryChip({
  active,
  accent,
  onClick,
  children,
}: {
  active: boolean;
  accent?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "btn-press rounded-full px-4 py-1.5 text-sm font-medium transition-all",
        active
          ? "bg-foreground text-background"
          : "bg-card text-muted-foreground hover:text-foreground card-shadow",
      )}
      style={
        active && accent
          ? { backgroundColor: accent, color: "#fff" }
          : undefined
      }
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
        "btn-press rounded-full px-3.5 py-1.5 text-sm transition-colors",
        active
          ? "bg-primary/10 font-semibold text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
