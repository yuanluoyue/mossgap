"use client";

import { useState } from "react";

import { GameDetailDrawer } from "@/components/admin/game-detail-drawer";
import { GameRowActions } from "@/components/admin/game-row-actions";
import type { GameStatus } from "@/types";

interface GameRowActionsWithDrawerProps {
  id: string;
  editHref: string;
  status: GameStatus;
}

/**
 * 包装 GameRowActions，附带查看详情抽屉。
 * 单行独立管理自己的 drawer 状态，避免全局 context 复杂度。
 */
export function GameRowActionsWithDrawer({
  id,
  editHref,
  status,
}: GameRowActionsWithDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <GameRowActions
        id={id}
        editHref={editHref}
        status={status}
        onView={() => setOpen(true)}
      />
      <GameDetailDrawer
        gameId={id}
        open={open}
        onOpenChange={(o) => setOpen(o)}
      />
    </>
  );
}
