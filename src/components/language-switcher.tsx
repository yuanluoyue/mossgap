"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Globe } from "lucide-react";

import { setLocale } from "@/i18n/actions";
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

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onSelect(next: string) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      // 刷新当前路由以应用新语言
      router.refresh();
    });
  }

  return (
    <Select value={locale} onValueChange={onSelect} disabled={isPending}>
      <SelectTrigger
        size="sm"
        className="gap-1.5 border-white/10 bg-white/5 text-xs uppercase tracking-widest text-white/70 hover:text-white"
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
              <span className="font-mono text-[10px] text-white/40">{SHORT[l]}</span>
              <span>{LABELS[l]}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
