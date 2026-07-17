import type { ReactNode } from "react";

export interface FaqItem {
  question: string;
  answer: string;
}

interface FaqProps {
  title: string;
  subtitle?: string;
  items: FaqItem[];
}

/**
 * FAQ 折叠面板（纯 HTML/CSS，零客户端 JS）。
 *
 * 使用原生 <details>/<summary> 实现：
 * - 无需 hydration，移动端 TBT 友好
 * - 问答文本在 HTML 中，SEO 可抓取
 * - 折叠/展开由浏览器原生处理，无 JS 开销
 */
export function Faq({ title, subtitle, items }: FaqProps) {
  if (!items || items.length === 0) return null;

  return (
    <section
      id="faq"
      className="relative z-10 mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8"
    >
      <header className="mb-8 text-center">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            {subtitle}
          </p>
        ) : null}
      </header>

      <div className="space-y-3">
        {items.map((item, i) => (
          <FaqRow key={i} question={item.question}>
            {item.answer}
          </FaqRow>
        ))}
      </div>
    </section>
  );
}

function FaqRow({ question, children }: { question: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-border/60 bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-heading text-base font-semibold text-foreground transition-colors hover:text-primary [&::-webkit-details-marker]:hidden">
        <span>{question}</span>
        <svg
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </details>
  );
}
