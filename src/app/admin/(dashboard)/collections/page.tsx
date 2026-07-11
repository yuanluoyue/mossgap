import { listAdminCollections } from "@/db/queries";
import { CollectionsManager } from "@/components/admin/collections-manager";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function AdminCollectionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(firstOf(sp.page) ?? "1") || 1);
  const search = firstOf(sp.search) ?? "";

  const result = await listAdminCollections({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
  });

  return (
    <CollectionsManager
      initialItems={result.items}
      total={result.total}
      page={page}
      search={search}
    />
  );
}

function firstOf(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
