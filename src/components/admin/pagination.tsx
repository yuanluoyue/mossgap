import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** 当前查询参数，会原样保留到分页链接中 */
  search?: string;
  status?: string;
}

/**
 * 后台 URL 分页组件
 * - 服务端渲染，通过 URL searchParams 切换页码
 * - 保留 search / status 等已有筛选参数
 */
export function Pagination({
  page,
  totalPages,
  search,
  status,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const start = page;
  const end = totalPages;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  function href(p: number) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status && status !== "all") params.set("status", status);
    params.set("page", String(p));
    return `?${params.toString()}`;
  }

  return (
    <div className="flex items-center justify-between border-t px-4 py-3">
      <span className="text-sm text-muted-foreground">
        第 {start} / {end} 页
      </span>
      <div className="flex items-center gap-1">
        <Link
          href={href(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-md border text-sm transition-colors",
            page <= 1
              ? "pointer-events-none opacity-50"
              : "hover:bg-muted",
          )}
        >
          <ChevronLeft className="size-4" />
        </Link>
        {pages.map((p, i) =>
          p === "..." ? (
            <span
              key={`dot-${i}`}
              className="px-2 text-sm text-muted-foreground"
            >
              ...
            </span>
          ) : (
            <Link
              key={p}
              href={href(p)}
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-md border text-sm transition-colors",
                p === page
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-muted",
              )}
            >
              {p}
            </Link>
          ),
        )}
        <Link
          href={href(Math.min(totalPages, page + 1))}
          aria-disabled={page >= totalPages}
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-md border text-sm transition-colors",
            page >= totalPages
              ? "pointer-events-none opacity-50"
              : "hover:bg-muted",
          )}
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
