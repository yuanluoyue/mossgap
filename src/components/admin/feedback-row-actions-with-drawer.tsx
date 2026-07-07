"use client";

import { useState } from "react";

import { FeedbackDetailDrawer } from "@/components/admin/feedback-detail-drawer";
import { FeedbackRowActions } from "@/components/admin/feedback-row-actions";
import type { FeedbackStatus } from "@/types";

interface FeedbackRowActionsWithDrawerProps {
  id: string;
  status: FeedbackStatus;
}

/** 包装 FeedbackRowActions，附带查看详情抽屉。 */
export function FeedbackRowActionsWithDrawer({
  id,
  status,
}: FeedbackRowActionsWithDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <FeedbackRowActions
        id={id}
        status={status}
        onView={() => setOpen(true)}
      />
      <FeedbackDetailDrawer
        feedbackId={id}
        open={open}
        onOpenChange={(o) => setOpen(o)}
      />
    </>
  );
}
