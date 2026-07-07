"use client";

import { useState, useTransition } from "react";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FeedbackDialogProps {
  /** 反馈类型：game 游戏反馈 / platform 平台反馈 */
  type: "game" | "platform";
  /** 游戏反馈时携带的游戏 ID */
  gameId?: string;
  /** 游戏标题（用于展示） */
  gameTitle?: string;
  /** 触发按钮（受控模式：由父组件渲染触发元素） */
  trigger?: React.ReactNode;
  /** 自定义按钮样式（当 trigger 未提供时使用内置按钮） */
  triggerLabel?: string;
  triggerClassName?: string;
  /** 多语言文案 */
  labels: {
    title: string;
    description: string;
    contentLabel: string;
    contentPlaceholder: string;
    contactLabel: string;
    contactPlaceholder: string;
    submit: string;
    submitting: string;
    success: string;
    error: string;
  };
}

/**
 * 通用反馈弹窗：支持游戏反馈与平台反馈。
 * - trigger 传入时由父组件控制渲染
 * - 未传 trigger 时渲染内置按钮
 */
export function FeedbackDialog({
  type,
  gameId,
  gameTitle,
  trigger,
  triggerLabel,
  triggerClassName,
  labels,
}: FeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    if (!content.trim()) {
      toast.error(labels.error);
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            gameId: gameId || "",
            contact: contact.trim(),
            content: content.trim(),
          }),
        });
        const data = (await res.json()) as {
          success?: boolean;
          error?: { message?: string };
        };
        if (!res.ok || !data.success) {
          toast.error(data?.error?.message ?? labels.error);
          return;
        }
        toast.success(labels.success);
        setContent("");
        setContact("");
        setOpen(false);
      } catch {
        toast.error(labels.error);
      }
    });
  }

  const defaultTrigger = (
    <Button
      type="button"
      variant="ghost"
      className={triggerClassName}
      size="sm"
    >
      <MessageSquare className="size-4" />
      {triggerLabel}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>
            {gameTitle ? `${labels.description} · ${gameTitle}` : labels.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feedback-content">{labels.contentLabel}</Label>
            <Textarea
              id="feedback-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={labels.contentPlaceholder}
              rows={5}
              maxLength={2000}
              disabled={pending}
            />
            <p className="text-right text-xs text-muted-foreground">
              {content.length}/2000
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-contact">{labels.contactLabel}</Label>
            <Input
              id="feedback-contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={labels.contactPlaceholder}
              maxLength={200}
              disabled={pending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={pending || !content.trim()}
          >
            <Send className="size-4" />
            {pending ? labels.submitting : labels.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
