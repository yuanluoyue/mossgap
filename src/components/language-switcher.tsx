"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";

import { routing } from "@/i18n/routing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LABELS: Record<string, string> = {
  en: "English",
  zh: "中文",
};

const SHORT: Record<string, string> = {
  en: "EN",
  zh: "中",
};

const COOKIE_NAME = "NEXT_LOCALE";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  function onSelect(next: string) {
    if (next === locale) return;
    // 写 cookie，然后 refresh 触发 middleware 和 request.ts 重新读取 locale
    document.cookie = `${COOKIE_NAME}=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    router.refresh();
  }

  return (
    <Select value={locale} onValueChange={onSelect}>
      <SelectTrigger
        size="sm"
        className="gap-1.5 text-xs uppercase tracking-widest"
        aria-label="Switch language"
      >
        <Globe className="size-3.5" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" className="min-w-36">
        {routing.locales.map((l) => (
          <SelectItem
            key={l}
            value={l}
            className="justify-between uppercase tracking-wider"
          >
            <span className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted-foreground">
                {SHORT[l]}
              </span>
              <span>{LABELS[l]}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
