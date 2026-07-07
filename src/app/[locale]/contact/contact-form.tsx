"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ContactFormLabels {
  name: string;
  email: string;
  subject: string;
  message: string;
  submit: string;
  submitting: string;
  success: string;
  error: string;
}

interface ContactFormProps {
  labels: ContactFormLabels;
}

/** 联系表单：本地校验 + 模拟提交（MVP 不接邮件服务） */
export function ContactForm({ labels }: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error(labels.error);
      return;
    }
    setSubmitting(true);
    // MVP：本地模拟提交。后续可接入邮件服务或工单系统
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    setSubmitted(true);
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
    toast.success(labels.success);
  }

  if (submitted) {
    return (
      <div className="mt-6 flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="size-7" />
        </div>
        <p className="font-heading text-lg font-semibold text-foreground">
          {labels.success}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="btn-press rounded-full"
          onClick={() => setSubmitted(false)}
        >
          {labels.submit}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="contact-name">{labels.name}</Label>
          <Input
            id="contact-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-email">{labels.email}</Label>
          <Input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-xl"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact-subject">{labels.subject}</Label>
        <Input
          id="contact-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="rounded-xl"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact-message">{labels.message}</Label>
        <Textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={5}
          className="rounded-xl"
        />
      </div>
      <Button
        type="submit"
        disabled={submitting}
        className="btn-press w-full rounded-full"
      >
        {submitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        {submitting ? labels.submitting : labels.submit}
      </Button>
    </form>
  );
}
