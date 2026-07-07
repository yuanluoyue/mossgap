import { and, desc, eq, like, sql, asc, count, inArray } from "drizzle-orm";
import { getDb, schema } from "./index";
import { admins, games, gamePlayLogs, gameLikes, gameDislikes, feedbacks, adminOperationLogs } from "./schema";
import type {
  AdminFeedback,
  AdminGame,
  FeedbackStatus,
  FeedbackType,
  GameCategory,
  GameLocale,
  GameSourceType,
  GameStatus,
  HowToPlay,
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
    likeCount: row.likeCount ?? 0,
    dislikeCount: row.dislikeCount ?? 0,
    locale: row.locale,
    sourceType: (row.sourceType ?? "zip") as GameSourceType,
    iframeUrl: row.iframeUrl ?? "",
    howToPlay: (row.howToPlay ?? { en: "", zh: "" }) as HowToPlay,
    relatedGameIds: row.relatedGameIds ?? [],
    ossSize: row.ossSize ?? 0,
    featured: row.featured ? true : false,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function toPublicGame(row: typeof games.$inferSelect, locale: Locale): PublicGame {
  const loc = row.locale ?? { en: { title: "", description: "" }, zh: { title: "", description: "" } };
  const title = loc[locale]?.title || loc.en?.title || row.title;
  const description = loc[locale]?.description || loc.en?.description || row.description;
  const howToPlayRaw = (row.howToPlay ?? { en: "", zh: "" }) as HowToPlay;
  const howToPlay = howToPlayRaw[locale] || howToPlayRaw.en || "";
  const sourceType = (row.sourceType ?? "zip") as GameSourceType;
  const iframeUrl = row.iframeUrl ?? "";
  const playUrl = sourceType === "iframe" && iframeUrl
    ? iframeUrl
    : publicObjectUrl(row.ossPrefix, row.entryFile);
  return {
    id: row.id,
    slug: row.slug,
    title,
    description,
    category: row.category as GameCategory,
    coverImage: row.coverImage,
    screenshots: row.screenshots,
    playCount: row.playCount,
    likeCount: row.likeCount ?? 0,
    dislikeCount: row.dislikeCount ?? 0,
    createdAt: toIso(row.createdAt),
    playUrl,
    sourceType,
    iframeUrl,
    howToPlay,
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
  sourceType?: GameSourceType;
  iframeUrl?: string;
  howToPlay?: HowToPlay;
  relatedGameIds?: string[];
  ossSize?: number;
  featured?: boolean;
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
      sourceType: input.sourceType ?? "zip",
      iframeUrl: input.iframeUrl ?? "",
      howToPlay: input.howToPlay ?? { en: "", zh: "" },
      relatedGameIds: input.relatedGameIds ?? [],
      ossSize: input.ossSize ?? 0,
      featured: input.featured ? 1 : 0,
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
    sourceType: GameSourceType;
    iframeUrl: string;
    howToPlay: HowToPlay;
    relatedGameIds: string[];
    ossSize: number;
    featured: boolean;
  }>,
): Promise<AdminGame | null> {
  const db = await getDb();
  const { featured, ...rest } = input;
  const [row] = await db
    .update(games)
    .set({
      ...rest,
      ...(featured !== undefined ? { featured: featured ? 1 : 0 } : {}),
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .where(eq(games.id, id))
    .returning();
  return row ? toAdminGame(row) : null;
}

/** 获取首页推荐游戏（featured=1 且已发布），按 createdAt 降序。 */
export async function listFeaturedGames(
  locale: Locale,
  limit = 10,
): Promise<PublicGame[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(games)
    .where(and(eq(games.status, "published"), eq(games.featured, 1)))
    .orderBy(desc(games.createdAt))
    .limit(limit);
  return rows.map((r) => toPublicGame(r, locale));
}

export async function deleteGame(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(games).where(eq(games.id, id));
}

/** 获取所有已发布游戏的精简列表（用于 B 端相关推荐选择器）。 */
export async function listPublishedGamesForPicker(): Promise<
  { id: string; title: string; slug: string; coverImage: string }[]
> {
  const db = await getDb();
  const rows = await db
    .select({
      id: games.id,
      title: games.title,
      slug: games.slug,
      coverImage: games.coverImage,
    })
    .from(games)
    .where(eq(games.status, "published"))
    .orderBy(desc(games.createdAt));
  return rows;
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

/** C 端相关推荐：优先使用人工配置的 relatedGameIds，不足再按同分类补齐。 */
export async function listRelatedGames(
  category: GameCategory,
  excludeId: string,
  locale: Locale,
  relatedIds: string[] = [],
  limit = 6,
): Promise<PublicGame[]> {
  const db = await getDb();
  const picked: PublicGame[] = [];

  // 1. 人工选择的相关游戏
  if (relatedIds.length > 0) {
    const rows = await db
      .select()
      .from(games)
      .where(and(eq(games.status, "published"), inArray(games.id, relatedIds)))
      .limit(limit + 1);
    for (const r of rows) {
      if (r.id !== excludeId) picked.push(toPublicGame(r, locale));
    }
  }

  // 2. 不足则按同分类补齐
  if (picked.length < limit) {
    const rows = await db
      .select()
      .from(games)
      .where(and(eq(games.category, category), eq(games.status, "published")))
      .limit(limit + 1);
    const existingIds = new Set(picked.map((g) => g.id));
    for (const r of rows) {
      if (r.id !== excludeId && !existingIds.has(r.id)) {
        picked.push(toPublicGame(r, locale));
      }
      if (picked.length >= limit) break;
    }
  }

  return picked.slice(0, limit);
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

// ===== 点赞 =====

/** 点赞（按 IP 去重，已点赞则取消）。返回当前点赞数与是否已点赞。 */
export async function toggleLike(
  gameId: string,
  ip: string,
): Promise<{ liked: boolean; likeCount: number }> {
  const db = await getDb();
  const existing = await db
    .select({ id: gameLikes.id })
    .from(gameLikes)
    .where(and(eq(gameLikes.gameId, gameId), eq(gameLikes.userIp, ip)))
    .limit(1);

  if (existing.length > 0) {
    // 取消点赞
    await db.batch([
      db
        .delete(gameLikes)
        .where(eq(gameLikes.id, existing[0].id)),
      db
        .update(games)
        .set({ likeCount: sql`MAX(${games.likeCount} - 1, 0)` })
        .where(eq(games.id, gameId)),
    ]);
    const row = await db
      .select({ value: games.likeCount })
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);
    return { liked: false, likeCount: row[0]?.value ?? 0 };
  }

  // 点赞
  await db.batch([
    db.insert(gameLikes).values({ gameId, userIp: ip }),
    db
      .update(games)
      .set({ likeCount: sql`${games.likeCount} + 1` })
      .where(eq(games.id, gameId)),
  ]);
  const row = await db
    .select({ value: games.likeCount })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);
  return { liked: true, likeCount: row[0]?.value ?? 0 };
}

/** 查询某 IP 是否已点赞某游戏。 */
export async function hasLiked(gameId: string, ip: string): Promise<boolean> {
  const db = await getDb();
  const row = await db
    .select({ id: gameLikes.id })
    .from(gameLikes)
    .where(and(eq(gameLikes.gameId, gameId), eq(gameLikes.userIp, ip)))
    .limit(1);
  return row.length > 0;
}

// ===== 点踩 =====

/** 点踩（按 IP 去重，已点踩则取消）。返回当前点踩数与是否已点踩。 */
export async function toggleDislike(
  gameId: string,
  ip: string,
): Promise<{ disliked: boolean; dislikeCount: number }> {
  const db = await getDb();
  const existing = await db
    .select({ id: gameDislikes.id })
    .from(gameDislikes)
    .where(and(eq(gameDislikes.gameId, gameId), eq(gameDislikes.userIp, ip)))
    .limit(1);

  if (existing.length > 0) {
    // 取消点踩
    await db.batch([
      db
        .delete(gameDislikes)
        .where(eq(gameDislikes.id, existing[0].id)),
      db
        .update(games)
        .set({ dislikeCount: sql`MAX(${games.dislikeCount} - 1, 0)` })
        .where(eq(games.id, gameId)),
    ]);
    const row = await db
      .select({ value: games.dislikeCount })
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);
    return { disliked: false, dislikeCount: row[0]?.value ?? 0 };
  }

  // 点踩
  await db.batch([
    db.insert(gameDislikes).values({ gameId, userIp: ip }),
    db
      .update(games)
      .set({ dislikeCount: sql`${games.dislikeCount} + 1` })
      .where(eq(games.id, gameId)),
  ]);
  const row = await db
    .select({ value: games.dislikeCount })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);
  return { disliked: true, dislikeCount: row[0]?.value ?? 0 };
}

/** 查询某 IP 是否已点踩某游戏。 */
export async function hasDisliked(gameId: string, ip: string): Promise<boolean> {
  const db = await getDb();
  const row = await db
    .select({ id: gameDislikes.id })
    .from(gameDislikes)
    .where(and(eq(gameDislikes.gameId, gameId), eq(gameDislikes.userIp, ip)))
    .limit(1);
  return row.length > 0;
}

// ===== 用户反馈 =====

function toAdminFeedback(
  row: typeof feedbacks.$inferSelect,
  gameTitle?: string,
): AdminFeedback {
  return {
    id: row.id,
    type: (row.type ?? "platform") as FeedbackType,
    gameId: row.gameId ?? "",
    contact: row.contact ?? "",
    content: row.content,
    status: (row.status ?? "pending") as FeedbackStatus,
    gameTitle,
    createdAt: toIso(row.createdAt),
  };
}

/** 创建用户反馈。 */
export async function createFeedback(input: {
  type: FeedbackType;
  gameId?: string;
  contact?: string;
  content: string;
  userIp: string;
  userAgent: string;
}): Promise<void> {
  const db = await getDb();
  await db.insert(feedbacks).values({
    type: input.type,
    gameId: input.gameId ?? "",
    contact: input.contact ?? "",
    content: input.content,
    userIp: input.userIp,
    userAgent: input.userAgent,
  });
}

/** 后台反馈列表（分页 + 筛选 + 搜索），并 join 游戏标题。 */
export async function listAdminFeedbacks(opts: {
  page: number;
  pageSize: number;
  type?: FeedbackType;
  status?: FeedbackStatus;
  search?: string;
}): Promise<{ items: AdminFeedback[]; total: number }> {
  const db = await getDb();
  const conditions = [];
  if (opts.type) conditions.push(eq(feedbacks.type, opts.type));
  if (opts.status) conditions.push(eq(feedbacks.status, opts.status));
  if (opts.search) conditions.push(like(feedbacks.content, `%${opts.search}%`));
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(feedbacks)
      .where(where)
      .orderBy(desc(feedbacks.createdAt))
      .limit(opts.pageSize)
      .offset((opts.page - 1) * opts.pageSize),
    db.select({ value: count() }).from(feedbacks).where(where),
  ]);

  // 批量查询关联游戏标题
  const gameIds = Array.from(
    new Set(
      rows.map((r) => r.gameId).filter((id): id is string => !!id && id.length > 0),
    ),
  );
  const gameMap = new Map<string, string>();
  if (gameIds.length > 0) {
    const gameRows = await db
      .select({ id: games.id, title: games.title })
      .from(games)
      .where(inArray(games.id, gameIds));
    for (const g of gameRows) gameMap.set(g.id, g.title);
  }

  return {
    items: rows.map((r) => toAdminFeedback(r, r.gameId ? gameMap.get(r.gameId) : undefined)),
    total: totalRows[0]?.value ?? 0,
  };
}

/** 获取单个反馈详情。 */
export async function getAdminFeedback(id: string): Promise<AdminFeedback | null> {
  const db = await getDb();
  const row = await db
    .select()
    .from(feedbacks)
    .where(eq(feedbacks.id, id))
    .limit(1);
  if (!row[0]) return null;
  let gameTitle: string | undefined;
  if (row[0].gameId) {
    const g = await db
      .select({ title: games.title })
      .from(games)
      .where(eq(games.id, row[0].gameId))
      .limit(1);
    gameTitle = g[0]?.title;
  }
  return toAdminFeedback(row[0], gameTitle);
}

/** 更新反馈状态。 */
export async function updateFeedbackStatus(
  id: string,
  status: FeedbackStatus,
): Promise<AdminFeedback | null> {
  const db = await getDb();
  const [row] = await db
    .update(feedbacks)
    .set({ status })
    .where(eq(feedbacks.id, id))
    .returning();
  return row ? toAdminFeedback(row) : null;
}

/** 删除反馈。 */
export async function deleteFeedback(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(feedbacks).where(eq(feedbacks.id, id));
}

/** 批量删除反馈。 */
export async function deleteFeedbacksBatch(ids: string[]): Promise<void> {
  const db = await getDb();
  await db.delete(feedbacks).where(inArray(feedbacks.id, ids));
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

/** OSS 用量统计：每个游戏的 ossSize（来自数据库缓存）+ 总和。 */
export async function getOssUsageStats(): Promise<{
  total: number;
  perGame: { id: string; title: string; slug: string; ossSize: number; sourceType: GameSourceType }[];
}> {
  const db = await getDb();
  const rows = await db
    .select({
      id: games.id,
      title: games.title,
      slug: games.slug,
      ossSize: games.ossSize,
      sourceType: games.sourceType,
    })
    .from(games)
    .orderBy(desc(games.createdAt));
  const perGame = rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    ossSize: r.ossSize ?? 0,
    sourceType: (r.sourceType ?? "zip") as GameSourceType,
  }));
  const total = perGame.reduce((sum, g) => sum + g.ossSize, 0);
  return { total, perGame };
}

// ===== 操作日志 =====

export async function writeOperationLog(input: {
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
  operatorIp?: string;
  operatorUseragent?: string;
}): Promise<void> {
  const db = await getDb();
  await db.insert(adminOperationLogs).values({
    action: input.action,
    targetType: input.targetType ?? "game",
    targetId: input.targetId ?? "",
    meta: input.meta ? JSON.stringify(input.meta) : "{}",
    operatorIp: input.operatorIp ?? "",
    operatorUseragent: input.operatorUseragent ?? "",
  });
}

export { schema, asc };
