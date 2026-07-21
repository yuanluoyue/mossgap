"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface GamesFilterCategory {
  slug: string;
  name: string;
  gameCount: number;
}

export interface GamesFilterTag {
  slug: string;
  name: string;
  gameCount: number;
}

interface GamesFilterProps {
  categories: GamesFilterCategory[];
  /** 可见标签列表；选中后跳转到 /tags/[slug] 聚合页 */
  tags: GamesFilterTag[];
}

/**
 * C 端游戏列表筛选条
 * - 分类下拉（按 slug）
 * - 标签下拉（选中即跳转到 /tags/[slug] 聚合页）
 * - 搜索框（带防抖，回车立即触发）
 * - 排序下拉（最新 / 最热）
 *
 * 分类/搜索/排序通过 URL searchParams 驱动，方便 SEO 抓取与分享；
 * 标签筛选是页面跳转，由 /tags/[slug] 路由处理。
 */
export function GamesFilter({ categories, tags }: GamesFilterProps) {
  const t = useTranslations("Games");
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get("category") ?? "all";
  const currentSort = searchParams.get("sort") ?? "newest";
  const currentQ = searchParams.get("q") ?? "";

  // 搜索输入本地状态（用于受控输入），实际触发查询走防抖
  const [q, setQ] = useState(currentQ);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 当 URL 中 q 变化时（如点分页/分类后），同步本地输入
  useEffect(() => {
    Promise.resolve().then(() => setQ(currentQ));
  }, [currentQ]);

  function updateParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    // 任何筛选变化都回到第 1 页
    params.delete("page");
    router.push(`?${params.toString()}`, { scroll: false });
  }

  function onCategoryChange(value: string) {
    updateParams({
      category: value === "all" ? null : value,
    });
  }

  /**
   * 选中标签后直接跳转到 /tags/[slug] 聚合页。
   * 不在 /games 页内做标签筛选，避免与 /tags 页面职责重叠。
   */
  function onTagChange(slug: string) {
    router.push(`/tags/${slug}`);
  }

  function onSortChange(value: string) {
    updateParams({ sort: value === "newest" ? null : value });
  }

  function commitSearch(value: string) {
    updateParams({ q: value.trim() || null });
  }

  function onSearchInput(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQ(value);
    // 防抖 400ms
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      commitSearch(value);
    }, 400);
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      commitSearch(q);
    }
  }

  function onClearSearch() {
    setQ("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    commitSearch("");
  }

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* 左：分类 + 标签 + 搜索 */}
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={currentCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="h-10 w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allCategories")}</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.name}
                {c.gameCount > 0 ? (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({c.gameCount})
                  </span>
                ) : null}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {tags.length > 0 ? (
          <Select onValueChange={onTagChange}>
            <SelectTrigger className="h-10 w-full sm:w-[180px]">
              <SelectValue placeholder={t("tagsLabel")} />
            </SelectTrigger>
            <SelectContent>
              {tags.map((tg) => (
                <SelectItem key={tg.slug} value={tg.slug}>
                  {tg.name}
                  {tg.gameCount > 0 ? (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({tg.gameCount})
                    </span>
                  ) : null}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={onSearchInput}
            onKeyDown={onSearchKeyDown}
            placeholder={t("searchPlaceholder")}
            className="h-10 pl-9 pr-9"
            type="search"
          />
          {q ? (
            <button
              type="button"
              onClick={onClearSearch}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* 右：排序 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t("sortLabel")}</span>
        <Select value={currentSort} onValueChange={onSortChange}>
          <SelectTrigger className="h-10 w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("sortNewest")}</SelectItem>
            <SelectItem value="popular">{t("sortPopular")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
