"use client";

import { useState, useEffect, useRef } from "react";
import { Calendar, Gamepad2, Mail, MessageSquare } from "lucide-react";

import type { AdminFeedback } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";

interface FeedbackDetailDrawerProps {
  feedbackId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_LABELS: Record<string, { label: string; variant: "default" | "secondary" }> = {
  game: { label: "游戏反馈", variant: "default" },
  platform: { label: "平台反馈", variant: "secondary" },
};

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  pending: { label: "待处理", variant: "secondary" },
  resolved: { label: "已处理", variant: "default" },
};

/** 查看反馈详情抽屉 */
export function FeedbackDetailDrawer({ feedbackId, open, onOpenChange }: FeedbackDetailDrawerProps) {
  const [feedback, setFeedback] = useState<AdminFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !feedbackId) return;
    if (fetchedIdRef.current === feedbackId) return;

    let cancelled = false;
    fetchedIdRef.current = feedbackId;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      setFeedback(null);
    });
    fetch(`/api/admin/feedbacks/${feedbackId}`)
      .then((r) => r.json())
      .then((data: unknown) => {
        if (cancelled) return;
        const d = data as { success?: boolean; data?: AdminFeedback };
        if (d.success && d.data) setFeedback(d.data);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, feedbackId]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      fetchedIdRef.current = null;
      setFeedback(null);
      setLoading(false);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>反馈详情</DialogTitle>
          <DialogDescription>查看用户反馈完整信息</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            加载中...
          </div>
        ) : feedback ? (
          <div className="space-y-5">
            {/* 类型与状态 */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={TYPE_LABELS[feedback.type]?.variant ?? "secondary"}>
                <MessageSquare className="size-3" />
                {TYPE_LABELS[feedback.type]?.label ?? feedback.type}
              </Badge>
              <Badge variant={STATUS_LABELS[feedback.status]?.variant ?? "secondary"}>
                {STATUS_LABELS[feedback.status]?.label ?? feedback.status}
              </Badge>
            </div>

            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">提交时间</p>
                <p className="mt-1 inline-flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  {formatDateTime(feedback.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">联系方式</p>
                <p className="mt-1 inline-flex items-center gap-1.5">
                  <Mail className="size-3.5" />
                  {feedback.contact || "—"}
                </p>
              </div>
              {feedback.type === "game" ? (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">关联游戏</p>
                  <p className="mt-1 inline-flex items-center gap-1.5">
                    <Gamepad2 className="size-3.5" />
                    {feedback.gameTitle || feedback.gameId || "—"}
                  </p>
                </div>
              ) : null}
            </div>

            {/* 反馈内容 */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground">反馈内容</p>
              <p className="mt-2 whitespace-pre-line rounded-md border bg-muted/30 p-4 text-sm leading-relaxed">
                {feedback.content}
              </p>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-muted-foreground">
            加载失败
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
