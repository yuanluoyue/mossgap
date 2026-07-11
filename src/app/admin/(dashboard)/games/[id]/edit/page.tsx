import { notFound } from "next/navigation";

import {
  getAdminGame,
  listAllCategoriesForPicker,
  listAllTagsForPicker,
  listAllCollectionsForPicker,
} from "@/db/queries";
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
  const [game, categories, tags, collections] = await Promise.all([
    getAdminGame(id),
    listAllCategoriesForPicker(),
    listAllTagsForPicker(),
    listAllCollectionsForPicker(),
  ]);
  if (!game) {
    notFound();
  }

  return (
    <GameForm
      game={game}
      categories={categories}
      tags={tags}
      collections={collections}
    />
  );
}
