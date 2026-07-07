import { notFound } from "next/navigation";

import { getAdminGame, listPublishedGamesForPicker } from "@/db/queries";
import { hasServerEnv } from "@/env";
import { GameForm } from "@/components/admin/game-form";

export const dynamic = "force-dynamic";

export default async function AdminEditGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!hasServerEnv()) {
    notFound();
  }

  const { id } = await params;
  const [game, picker] = await Promise.all([
    getAdminGame(id),
    listPublishedGamesForPicker(),
  ]);
  if (!game) {
    notFound();
  }

  // 排除当前游戏本身
  const candidates = picker.filter((g) => g.id !== id);

  return <GameForm game={game} candidates={candidates} />;
}
