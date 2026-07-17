"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
 * FAQ 折叠面板。
 *
 * 内容由服务端通过 next-intl 注入（保证 HTML 中包含完整问答文本，
 * 利于 SEO 抓取）。此组件只负责交互（展开/收起）。
 */
export function Faq({ title, subtitle, items }: FaqProps) {
  if (!items || items.length === 0) return null;

  return (
    <section id="faq" className="relative z-10 mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
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

      <Accordion type="single" collapsible className="space-y-3">
        {items.map((item, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
