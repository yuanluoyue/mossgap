"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Globe, Check } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COOKIE_NAME = "NEXT_LOCALE";

/** 写入 locale cookie，提取到组件外以规避 react-hooks/immutability 规则 */
function setLocaleCookie(next: string) {
  document.cookie = `${COOKIE_NAME}=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
}

const LANGUAGES = [
  { code: "en", label: "English", short: "EN", Flag: EnFlag },
  { code: "zh", label: "中文", short: "中", Flag: CnFlag },
] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  function onSelect(next: string) {
    if (next === locale) return;
    // 写 cookie，然后 refresh 触发 middleware 和 request.ts 重新读取 locale
    setLocaleCookie(next);
    router.refresh();
  }

  const current =
    LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          aria-label="Switch language"
        >
          <Globe className="size-4" />
          <span className="text-xs font-medium uppercase tracking-wider">
            {current.short}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-32 p-1"
      >
        {LANGUAGES.map((l) => {
          const active = l.code === locale;
          return (
            <DropdownMenuItem
              key={l.code}
              onSelect={() => onSelect(l.code)}
              className={cn(
                "gap-2 rounded-md px-2.5 py-2 text-sm",
                active && "bg-muted font-medium",
              )}
            >
              <l.Flag />
              <span>{l.label}</span>
              {active ? (
                <Check className="ml-auto size-3.5 text-primary" />
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─── 国旗（inline SVG，避免额外资源文件） ─── */

function EnFlag() {
  // 美国旗简化版：13 条红白横条 + 蓝色矩形 + 白色星点网格
  return (
    <svg
      viewBox="0 0 60 40"
      className="inline-block h-3 w-4 shrink-0 rounded-sm object-cover"
      aria-hidden="true"
    >
      <rect width="60" height="40" fill="#fff" />
      <g fill="#B22234">
        <rect width="60" height="3.077" />
        <rect width="60" height="3.077" y="6.154" />
        <rect width="60" height="3.077" y="12.308" />
        <rect width="60" height="3.077" y="18.462" />
        <rect width="60" height="3.077" y="24.615" />
        <rect width="60" height="3.077" y="30.769" />
        <rect width="60" height="3.077" y="36.923" />
      </g>
      <rect width="24" height="21.538" fill="#3C3B6E" />
      <g fill="#fff">
        {/* 简化星点网格：5 行交替 6/5 颗 */}
        <g>
          <circle cx="2.5" cy="2.5" r="0.6" />
          <circle cx="6.5" cy="2.5" r="0.6" />
          <circle cx="10.5" cy="2.5" r="0.6" />
          <circle cx="14.5" cy="2.5" r="0.6" />
          <circle cx="18.5" cy="2.5" r="0.6" />
          <circle cx="22.5" cy="2.5" r="0.6" />
        </g>
        <g>
          <circle cx="4.5" cy="5.5" r="0.6" />
          <circle cx="8.5" cy="5.5" r="0.6" />
          <circle cx="12.5" cy="5.5" r="0.6" />
          <circle cx="16.5" cy="5.5" r="0.6" />
          <circle cx="20.5" cy="5.5" r="0.6" />
        </g>
        <g>
          <circle cx="2.5" cy="8.5" r="0.6" />
          <circle cx="6.5" cy="8.5" r="0.6" />
          <circle cx="10.5" cy="8.5" r="0.6" />
          <circle cx="14.5" cy="8.5" r="0.6" />
          <circle cx="18.5" cy="8.5" r="0.6" />
          <circle cx="22.5" cy="8.5" r="0.6" />
        </g>
        <g>
          <circle cx="4.5" cy="11.5" r="0.6" />
          <circle cx="8.5" cy="11.5" r="0.6" />
          <circle cx="12.5" cy="11.5" r="0.6" />
          <circle cx="16.5" cy="11.5" r="0.6" />
          <circle cx="20.5" cy="11.5" r="0.6" />
        </g>
        <g>
          <circle cx="2.5" cy="14.5" r="0.6" />
          <circle cx="6.5" cy="14.5" r="0.6" />
          <circle cx="10.5" cy="14.5" r="0.6" />
          <circle cx="14.5" cy="14.5" r="0.6" />
          <circle cx="18.5" cy="14.5" r="0.6" />
          <circle cx="22.5" cy="14.5" r="0.6" />
        </g>
        <g>
          <circle cx="4.5" cy="17.5" r="0.6" />
          <circle cx="8.5" cy="17.5" r="0.6" />
          <circle cx="12.5" cy="17.5" r="0.6" />
          <circle cx="16.5" cy="17.5" r="0.6" />
          <circle cx="20.5" cy="17.5" r="0.6" />
        </g>
      </g>
    </svg>
  );
}

function CnFlag() {
  // 中国国旗：红底 + 1 颗大星 + 4 颗小星
  // viewBox 60x40（3:2），坐标按国旗规范换算
  return (
    <svg
      viewBox="0 0 60 40"
      className="inline-block h-3 w-4 shrink-0 rounded-sm object-cover"
      aria-hidden="true"
    >
      <rect width="60" height="40" fill="#DE2910" />
      <g fill="#FFDE00">
        {/* 大星：中心 (10,10)，半径 4 */}
        <Star x={10} y={10} size={4} />
        {/* 4 颗小星：半径 2，围绕大星 */}
        <Star x={20} y={4} size={2} />
        <Star x={24} y={8} size={2} />
        <Star x={24} y={14} size={2} />
        <Star x={20} y={18} size={2} />
      </g>
    </svg>
  );
}

/** 简化五角星：用 polygon 绘制，size 控制缩放 */
function Star({ x, y, size }: { x: number; y: number; size: number }) {
  // 标准五角星顶点（以原点为中心，半径 1）
  const pts = [
    [0, -1],
    [0.224, -0.309],
    [0.951, -0.309],
    [0.363, 0.118],
    [0.588, 0.809],
    [0, 0.382],
    [-0.588, 0.809],
    [-0.363, 0.118],
    [-0.951, -0.309],
    [-0.224, -0.309],
  ];
  const points = pts
    .map(([px, py]) => `${x + px * size},${y + py * size}`)
    .join(" ");
  return <polygon points={points} />;
}
