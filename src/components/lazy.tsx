"use client";

import dynamic from "next/dynamic";

/**
 * 延迟加载的客户端组件集合。
 *
 * 这些组件在首屏不可见或不阻塞交互（弹窗、通知容器），
 * 用 next/dynamic + ssr:false 拆出独立 chunk，减少首屏 JS 体积，
 * 降低 TBT（Total Blocking Time）和 FCP。
 *
 * 服务端组件无法直接使用 ssr:false，所以在此统一导出 client wrapper。
 */

/** 反馈弹窗：点击触发后才需要 Dialog/Textarea/Input 等 UI 组件 */
export const FeedbackDialogLazy = dynamic(
  () =>
    import("@/components/feedback-dialog").then((m) => ({
      default: m.FeedbackDialog,
    })),
  { ssr: false },
);

/** Toaster 容器：仅用于展示 toast 通知，延迟到 hydration 后加载 */
export const ToasterLazy = dynamic(
  () =>
    import("@/components/ui/sonner").then((m) => ({
      default: m.Toaster,
    })),
  { ssr: false, loading: () => null },
);
