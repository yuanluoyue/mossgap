import { notFound } from "next/navigation";

import { getAdminGame } from "@/db/queries";
import { hasServerEnv } from "@/env";
import { GameForm } from "@/components/admin/game-form";

export const dynamic = "force-dynamic";

export default async function AdminEditGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await hasServerEnv())) {
    notFound();
  }

  const { id } = await params;
  const game = await getAdminGame(id);
  if (!game) {
    notFound();
  }

  return <GameForm game={game} />;
}
