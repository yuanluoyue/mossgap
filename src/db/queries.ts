import { and, desc, eq, like, sql, asc, count } from "drizzle-orm";
import { getDb, schema } from "./index";
import { admins, games, gamePlayLogs } from "./schema";
import type {
  AdminGame,
  GameCategory,
  GameLocale,
  GameStatus,
  PublicGame,
} from "@/types";
import { publicObjectUrl } from "@/lib/oss";

type Locale = "en" | "zh";

/** 把 Unix 秒转换为 ISO 字符串。 */
function toIso(seconds: number): string {
  return new Date(seconds * 1000).toISOString();
}

function toAdminGame(row: typeof games.$inferSelect): AdminGame {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: row.category as GameCategory,
    coverImage: row.coverImage,
    screenshots: row.screenshots,
    entryFile: row.entryFile,
    ossPrefix: row.ossPrefix,
    status: row.status as GameStatus,
    playCount: row.playCount,
    locale: row.locale,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function toPublicGame(row: typeof games.$inferSelect, locale: Locale): PublicGame {
  const loc = row.locale ?? { en: { title: "", description: "" }, zh: { title: "", description: "" } };
  const title = loc[locale]?.title || loc.en?.title || row.title;
  const description = loc[locale]?.description || loc.en?.description || row.description;
  return {
    id: row.id,
    slug: row.slug,
    title,
    description,
    category: row.category as GameCategory,
    coverImage: row.coverImage,
    screenshots: row.screenshots,
    playCount: row.playCount,
    createdAt: toIso(row.createdAt),
    playUrl: publicObjectUrl(row.ossPrefix, row.entryFile),
  };
}

// ===== Admin 账号查询 =====

export async function getAdminByUsername(
  username: string,
): Promise<{ id: string; username: string; passwordHash: string } | null> {
  const db = await getDb();
  const row = await db
    .select({
      id: admins.id,
      username: admins.username,
      passwordHash: admins.passwordHash,
    })
    .from(admins)
    .where(eq(admins.username, username))
    .limit(1);
  return row[0] ?? null;
}

// ===== Admin 游戏查询 =====

export async function listAdminGames(opts: {
  page: number;
  pageSize: number;
  search?: string;
  status?: GameStatus;
}): Promise<{ items: AdminGame[]; total: number }> {
  const db = await getDb();
  const conditions = [];
  if (opts.search) {
    // SQLite 的 LIKE 对 ASCII 默认大小写不敏感
    conditions.push(like(games.title, `%${opts.search}%`));
  }
  if (opts.status) {
    conditions.push(eq(games.status, opts.status));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(games)
      .where(where)
      .orderBy(desc(games.createdAt))
      .limit(opts.pageSize)
      .offset((opts.page - 1) * opts.pageSize),
    db.select({ value: count() }).from(games).where(where),
  ]);

  return { items: rows.map(toAdminGame), total: totalRows[0]?.value ?? 0 };
}

export async function getAdminGame(id: string): Promise<AdminGame | null> {
  const db = await getDb();
  const row = await db.select().from(games).where(eq(games.id, id)).limit(1);
  return row[0] ? toAdminGame(row[0]) : null;
}

export async function getAdminGameBySlug(slug: string): Promise<AdminGame | null> {
  const db = await getDb();
  const row = await db.select().from(games).where(eq(games.slug, slug)).limit(1);
  return row[0] ? toAdminGame(row[0]) : null;
}

export async function createGame(input: {
  slug: string;
  title: string;
  description?: string;
  category?: GameCategory;
  coverImage?: string;
  screenshots?: string[];
  entryFile?: string;
  ossPrefix: string;
  status?: GameStatus;
  locale?: GameLocale;
}): Promise<AdminGame> {
  const db = await getDb();
  const [row] = await db
    .insert(games)
    .values({
      slug: input.slug,
      title: input.title,
      description: input.description ?? "",
      category: input.category ?? "other",
      coverImage: input.coverImage ?? "",
      screenshots: input.screenshots ?? [],
      entryFile: input.entryFile ?? "index.html",
      ossPrefix: input.ossPrefix,
      status: input.status ?? "draft",
      locale:
        input.locale ?? {
          en: { title: input.title, description: input.description ?? "" },
          zh: { title: input.title, description: input.description ?? "" },
        },
    })
    .returning();
  return toAdminGame(row!);
}

export async function updateGame(
  id: string,
  input: Partial<{
    slug: string;
    title: string;
    description: string;
    category: GameCategory;
    coverImage: string;
    screenshots: string[];
    entryFile: string;
    status: GameStatus;
    locale: GameLocale;
  }>,
): Promise<AdminGame | null> {
  const db = await getDb();
  const [row] = await db
    .update(games)
    .set({ ...input, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(games.id, id))
    .returning();
  return row ? toAdminGame(row) : null;
}

export async function deleteGame(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(games).where(eq(games.id, id));
}

// ===== C 端公开查询 =====

export async function listPublicGames(
  opts: {
    page: number;
    pageSize: number;
    category?: GameCategory;
    sort?: "popular" | "newest";
    q?: string;
  },
  locale: Locale,
): Promise<{ items: PublicGame[]; total: number }> {
  const db = await getDb();
  const conditions = [eq(games.status, "published")];
  if (opts.category) conditions.push(eq(games.category, opts.category));
  if (opts.q) conditions.push(like(games.title, `%${opts.q}%`));
  const where = and(...conditions);

  const order =
    opts.sort === "popular" ? desc(games.playCount) : desc(games.createdAt);

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(games)
      .where(where)
      .orderBy(order)
      .limit(opts.pageSize)
      .offset((opts.page - 1) * opts.pageSize),
    db.select({ value: count() }).from(games).where(where),
  ]);

  return { items: rows.map((r) => toPublicGame(r, locale)), total: totalRows[0]?.value ?? 0 };
}

export async function getPublicGameBySlug(
  slug: string,
  locale: Locale,
): Promise<PublicGame | null> {
  const db = await getDb();
  const row = await db
    .select()
    .from(games)
    .where(and(eq(games.slug, slug), eq(games.status, "published")))
    .limit(1);
  return row[0] ? toPublicGame(row[0], locale) : null;
}

export async function listRelatedGames(
  category: GameCategory,
  excludeId: string,
  locale: Locale,
  limit = 6,
): Promise<PublicGame[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(games)
    .where(and(eq(games.category, category), eq(games.status, "published")))
    .limit(limit + 1);
  return rows
    .filter((r) => r.id !== excludeId)
    .slice(0, limit)
    .map((r) => toPublicGame(r, locale));
}

export async function incrementPlayCount(
  gameId: string,
  ip: string,
  userAgent: string,
): Promise<void> {
  const db = await getDb();
  await db.batch([
    db
      .update(games)
      .set({ playCount: sql`${games.playCount} + 1` })
      .where(eq(games.id, gameId)),
    db.insert(gamePlayLogs).values({ gameId, userIp: ip, userAgent }),
  ]);
}

// ===== Dashboard 统计 =====

export async function getDashboardStats(): Promise<{
  total: number;
  published: number;
  draft: number;
  archived: number;
  recent: AdminGame[];
}> {
  const db = await getDb();
  const [totalRow, publishedRow, draftRow, archivedRow, recentRows] = await Promise.all([
    db.select({ value: count() }).from(games),
    db.select({ value: count() }).from(games).where(eq(games.status, "published")),
    db.select({ value: count() }).from(games).where(eq(games.status, "draft")),
    db.select({ value: count() }).from(games).where(eq(games.status, "archived")),
    db.select().from(games).orderBy(desc(games.createdAt)).limit(5),
  ]);
  return {
    total: totalRow[0]?.value ?? 0,
    published: publishedRow[0]?.value ?? 0,
    draft: draftRow[0]?.value ?? 0,
    archived: archivedRow[0]?.value ?? 0,
    recent: recentRows.map(toAdminGame),
  };
}

export { schema, asc };
