import { and, desc, eq, like, sql, asc, count, inArray } from "drizzle-orm";
import { getDb, schema } from "./index";
import {
  admins,
  games,
  gamePlayLogs,
  gameLikes,
  gameDislikes,
  feedbacks,
  adminOperationLogs,
  sysRoles,
  sysMenus,
  sysUserRoles,
  sysRoleMenus,
  settings,
  categories,
  tags,
  collections,
  gameTags,
  gameCollections,
} from "./schema";
import type {
  AdminFeedback,
  AdminGame,
  AdminCategory,
  AdminTag,
  AdminCollection,
  FeedbackStatus,
  FeedbackType,
  GameCategory,
  GameLocale,
  GameSourceType,
  GameStatus,
  HowToPlay,
  PublicGame,
  PublicCategory,
  PublicTag,
  PublicCollection,
  TaxonomyLocale,
  CollectionLayout,
} from "@/types";
import { publicObjectUrl } from "@/lib/oss";

type Locale = "en" | "zh";

/** 把 Unix 秒转换为 ISO 字符串。 */
function toIso(seconds: number | null | undefined): string {
  if (!seconds) return "";
  return new Date(seconds * 1000).toISOString();
}

function toAdminGame(
  row: typeof games.$inferSelect,
  opts?: { tagIds?: string[]; collectionIds?: string[] },
): AdminGame {
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
    categoryId: row.categoryId ?? null,
    tagIds: opts?.tagIds ?? [],
    collectionIds: opts?.collectionIds ?? [],
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

async function toPublicGame(row: typeof games.$inferSelect, locale: Locale): Promise<PublicGame> {
  const loc = row.locale ?? { en: { title: "", description: "" }, zh: { title: "", description: "" } };
  const title = loc[locale]?.title || loc.en?.title || row.title;
  const description = loc[locale]?.description || loc.en?.description || row.description;
  const howToPlayRaw = (row.howToPlay ?? { en: "", zh: "" }) as HowToPlay;
  const howToPlay = howToPlayRaw[locale] || howToPlayRaw.en || "";
  const sourceType = (row.sourceType ?? "zip") as GameSourceType;
  const iframeUrl = row.iframeUrl ?? "";
  const playUrl = sourceType === "iframe" && iframeUrl
    ? iframeUrl
    : await publicObjectUrl(row.ossPrefix, row.entryFile);
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

  return { items: rows.map((r) => toAdminGame(r)), total: totalRows[0]?.value ?? 0 };
}

export async function getAdminGame(id: string): Promise<AdminGame | null> {
  const db = await getDb();
  const row = await db.select().from(games).where(eq(games.id, id)).limit(1);
  if (!row[0]) return null;
  const [tagRows, collectionRows] = await Promise.all([
    db.select({ tagId: gameTags.tagId }).from(gameTags).where(eq(gameTags.gameId, id)),
    db.select({ collectionId: gameCollections.collectionId }).from(gameCollections).where(eq(gameCollections.gameId, id)),
  ]);
  return toAdminGame(row[0], {
    tagIds: tagRows.map((r) => r.tagId),
    collectionIds: collectionRows.map((r) => r.collectionId),
  });
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
  categoryId?: string | null;
  tagIds?: string[];
  collectionIds?: string[];
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
      categoryId: input.categoryId ?? null,
    })
    .returning();
  const gameId = row!.id;
  const tagIds = input.tagIds ?? [];
  const collectionIds = input.collectionIds ?? [];
  if (tagIds.length > 0) {
    await db.insert(gameTags).values(tagIds.map((tagId) => ({ gameId, tagId })));
  }
  if (collectionIds.length > 0) {
    await db.insert(gameCollections).values(collectionIds.map((collectionId) => ({ gameId, collectionId })));
  }
  return toAdminGame(row!, { tagIds, collectionIds });
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
    categoryId: string | null;
    tagIds: string[];
    collectionIds: string[];
    ossPrefix: string;
  }>,
): Promise<AdminGame | null> {
  const db = await getDb();
  const { featured, categoryId, tagIds, collectionIds, ...rest } = input;
  const [row] = await db
    .update(games)
    .set({
      ...rest,
      ...(featured !== undefined ? { featured: featured ? 1 : 0 } : {}),
      ...(categoryId !== undefined ? { categoryId } : {}),
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .where(eq(games.id, id))
    .returning();
  if (!row) return null;

  if (tagIds !== undefined) {
    await db.delete(gameTags).where(eq(gameTags.gameId, id));
    if (tagIds.length > 0) {
      await db.insert(gameTags).values(tagIds.map((tagId) => ({ gameId: id, tagId })));
    }
  }
  if (collectionIds !== undefined) {
    await db.delete(gameCollections).where(eq(gameCollections.gameId, id));
    if (collectionIds.length > 0) {
      await db.insert(gameCollections).values(collectionIds.map((collectionId) => ({ gameId: id, collectionId })));
    }
  }

  const [tagRows, collectionRows] = await Promise.all([
    db.select({ tagId: gameTags.tagId }).from(gameTags).where(eq(gameTags.gameId, id)),
    db.select({ collectionId: gameCollections.collectionId }).from(gameCollections).where(eq(gameCollections.gameId, id)),
  ]);
  return toAdminGame(row, {
    tagIds: tagRows.map((r) => r.tagId),
    collectionIds: collectionRows.map((r) => r.collectionId),
  });
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
  return Promise.all(rows.map((r) => toPublicGame(r, locale)));
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

/** 获取所有已发布游戏的 slug + updatedAt（供 sitemap 使用） */
export async function listPublishedGameSlugs(): Promise<
  { slug: string; updatedAt: number | null }[]
> {
  const db = await getDb();
  const rows = await db
    .select({
      slug: games.slug,
      updatedAt: games.updatedAt,
    })
    .from(games)
    .where(eq(games.status, "published"))
    .orderBy(desc(games.createdAt));
  return rows;
}

/** 获取所有可见分类的 slug（供 generateStaticParams 使用）。 */
export async function listPublicCategorySlugs(): Promise<{ slug: string }[]> {
  const db = await getDb();
  return db.select({ slug: categories.slug }).from(categories).where(eq(categories.isVisible, 1));
}

/** 获取所有可见标签的 slug（供 generateStaticParams 使用）。 */
export async function listPublicTagSlugs(): Promise<{ slug: string }[]> {
  const db = await getDb();
  return db.select({ slug: tags.slug }).from(tags).where(eq(tags.isVisible, 1));
}

/** 获取所有可见专题的 slug（供 generateStaticParams 使用）。 */
export async function listPublicCollectionSlugs(): Promise<{ slug: string }[]> {
  const db = await getDb();
  return db.select({ slug: collections.slug }).from(collections).where(eq(collections.isVisible, 1));
}

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

  return { items: await Promise.all(rows.map((r) => toPublicGame(r, locale))), total: totalRows[0]?.value ?? 0 };
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
  return row[0] ? await toPublicGame(row[0], locale) : null;
}

/**
 * C 端相关推荐（MVP）。
 *
 * 推荐顺序：
 * 1. 同分类（categoryId）的已发布游戏
 * 2. 标签相同数越多的越靠前
 * 3. 不足则用其他已发布游戏补齐
 *
 * @param gameId 当前游戏 ID
 * @param category 旧枚举分类（保留参数兼容，不再用于推荐）
 * @param locale 语言
 * @param _relatedIds 人工配置的相关游戏 ID（保留参数兼容，MVP 暂不使用）
 * @param limit 返回数量，默认 6
 */
export async function listRelatedGames(
  _category: GameCategory,
  gameId: string,
  locale: Locale,
  _relatedIds: string[] = [],
  limit = 6,
): Promise<PublicGame[]> {
  const db = await getDb();

  // 查当前游戏的 categoryId 和 tagIds
  const current = await db
    .select({ categoryId: games.categoryId })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);
  const categoryId = current[0]?.categoryId ?? null;

  let currentTagIds: string[] = [];
  {
    const tagRows = await db
      .select({ tagId: gameTags.tagId })
      .from(gameTags)
      .where(eq(gameTags.gameId, gameId));
    currentTagIds = tagRows.map((r) => r.tagId);
  }

  const picked: PublicGame[] = [];
  const pickedIds = new Set<string>([gameId]);

  // 1. 同分类游戏
  if (categoryId) {
    const rows = await db
      .select()
      .from(games)
      .where(and(eq(games.categoryId, categoryId), eq(games.status, "published")))
      .orderBy(desc(games.playCount))
      .limit(limit + 1);
    for (const r of rows) {
      if (picked.length >= limit) break;
      if (pickedIds.has(r.id)) continue;
      picked.push(await toPublicGame(r, locale));
      pickedIds.add(r.id);
    }
  }

  // 2. 标签相同的游戏（按相同标签数排序）
  if (picked.length < limit && currentTagIds.length > 0) {
    // 查所有共享至少一个标签的游戏 ID
    const tagMatchRows = await db
      .select({
        gameId: gameTags.gameId,
        tagId: gameTags.tagId,
      })
      .from(gameTags)
      .where(inArray(gameTags.tagId, currentTagIds));
    // 统计每个游戏的相同标签数
    const matchCount = new Map<string, number>();
    for (const r of tagMatchRows) {
      if (r.gameId === gameId || pickedIds.has(r.gameId)) continue;
      matchCount.set(r.gameId, (matchCount.get(r.gameId) ?? 0) + 1);
    }
    // 按相同标签数降序
    const sortedIds = [...matchCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .map((e) => e[0]);
    if (sortedIds.length > 0) {
      const rows = await db
        .select()
        .from(games)
        .where(and(inArray(games.id, sortedIds), eq(games.status, "published")))
        .limit(limit - picked.length);
      // 按相同标签数排序
      const rowMap = new Map(rows.map((r) => [r.id, r]));
      for (const id of sortedIds) {
        if (picked.length >= limit) break;
        const r = rowMap.get(id);
        if (!r || pickedIds.has(r.id)) continue;
        picked.push(await toPublicGame(r, locale));
        pickedIds.add(r.id);
      }
    }
  }

  // 3. 不足则用其他已发布游戏补齐（按游玩数降序）
  if (picked.length < limit) {
    const rows = await db
      .select()
      .from(games)
      .where(eq(games.status, "published"))
      .orderBy(desc(games.playCount))
      .limit(limit - picked.length + pickedIds.size);
    for (const r of rows) {
      if (picked.length >= limit) break;
      if (pickedIds.has(r.id)) continue;
      picked.push(await toPublicGame(r, locale));
      pickedIds.add(r.id);
    }
  }

  return picked.slice(0, limit);
}

/** 去重时间窗口（秒）：同一 IP 在此时间内重复访问不重复计数。 */
const PLAY_DEDUP_WINDOW = 30 * 60; // 30 分钟

export async function incrementPlayCount(
  gameId: string,
  ip: string,
  userAgent: string,
): Promise<void> {
  const db = await getDb();
  const now = Math.floor(Date.now() / 1000);
  const since = now - PLAY_DEDUP_WINDOW;

  // 同一 IP 在时间窗口内已有记录则不重复计数
  const recent = await db
    .select({ id: gamePlayLogs.id })
    .from(gamePlayLogs)
    .where(
      and(
        eq(gamePlayLogs.gameId, gameId),
        eq(gamePlayLogs.userIp, ip),
        sql`${gamePlayLogs.playedAt} >= ${since}`,
      ),
    )
    .limit(1);
  if (recent.length > 0) return;

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
    recent: recentRows.map((r) => toAdminGame(r)),
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
  operatorId?: string;
  operatorUsername?: string;
  resource?: string;
}): Promise<void> {
  const db = await getDb();
  await db.insert(adminOperationLogs).values({
    action: input.action,
    targetType: input.targetType ?? "game",
    targetId: input.targetId ?? "",
    meta: input.meta ? JSON.stringify(input.meta) : "{}",
    operatorIp: input.operatorIp ?? "",
    operatorUseragent: input.operatorUseragent ?? "",
    operatorId: input.operatorId,
    operatorUsername: input.operatorUsername,
    resource: input.resource,
  });
}

// ===== RBAC：管理员（用户管理） =====

export interface AdminUser {
  id: string;
  username: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
  isActive: boolean;
  createdAt: string;
  roleId: string | null;
  roleName: string | null;
  roleCode: string | null;
}

/** 按 ID 查管理员完整记录（含密码哈希）。 */
export async function getAdminById(id: string) {
  const db = await getDb();
  const row = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
  return row[0] ?? null;
}

/** 管理员列表（分页 + 搜索，带首个角色信息）。 */
export async function listAdmins(opts: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<{ items: AdminUser[]; total: number }> {
  const db = await getDb();
  const where = opts.search ? like(admins.username, `%${opts.search}%`) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(admins)
      .where(where)
      .orderBy(desc(admins.createdAt))
      .limit(opts.pageSize)
      .offset((opts.page - 1) * opts.pageSize),
    db.select({ value: count() }).from(admins).where(where),
  ]);

  // 批量查询每个管理员的角色（取首个）
  const adminIds = rows.map((r) => r.id);
  const roleMap = new Map<string, { roleId: string; roleName: string; roleCode: string }>();
  if (adminIds.length > 0) {
    const userRoleRows = await db
      .select({
        adminId: sysUserRoles.adminId,
        roleId: sysUserRoles.roleId,
      })
      .from(sysUserRoles)
      .where(inArray(sysUserRoles.adminId, adminIds));
    const roleIds = Array.from(new Set(userRoleRows.map((r) => r.roleId)));
    const roleInfoMap = new Map<string, { name: string; code: string }>();
    if (roleIds.length > 0) {
      const roleRows = await db
        .select({ id: sysRoles.id, name: sysRoles.name, code: sysRoles.code })
        .from(sysRoles)
        .where(inArray(sysRoles.id, roleIds));
      for (const r of roleRows) roleInfoMap.set(r.id, { name: r.name, code: r.code });
    }
    for (const ur of userRoleRows) {
      const info = roleInfoMap.get(ur.roleId);
      if (info && !roleMap.has(ur.adminId)) {
        roleMap.set(ur.adminId, { roleId: ur.roleId, roleName: info.name, roleCode: info.code });
      }
    }
  }

  return {
    items: rows.map((r) => {
      const role = roleMap.get(r.id);
      return {
        id: r.id,
        username: r.username,
        email: r.email,
        name: r.name,
        avatar: r.avatar,
        isActive: (r.isActive ?? 1) === 1,
        createdAt: toIso(r.createdAt),
        roleId: role?.roleId ?? null,
        roleName: role?.roleName ?? null,
        roleCode: role?.roleCode ?? null,
      };
    }),
    total: totalRows[0]?.value ?? 0,
  };
}

export async function createAdmin(input: {
  username: string;
  passwordHash: string;
  email?: string;
  name?: string;
}): Promise<string> {
  const db = await getDb();
  const [row] = await db
    .insert(admins)
    .values({
      username: input.username,
      passwordHash: input.passwordHash,
      email: input.email,
      name: input.name,
      isActive: 1,
    })
    .returning({ id: admins.id });
  return row!.id;
}

export async function updateAdmin(
  id: string,
  input: Partial<{
    email: string;
    name: string;
    avatar: string;
    isActive: boolean;
    passwordHash: string;
  }>,
): Promise<void> {
  const db = await getDb();
  const set: Record<string, unknown> = { updatedAt: Math.floor(Date.now() / 1000) };
  if (input.email !== undefined) set.email = input.email;
  if (input.name !== undefined) set.name = input.name;
  if (input.avatar !== undefined) set.avatar = input.avatar;
  if (input.isActive !== undefined) set.isActive = input.isActive ? 1 : 0;
  if (input.passwordHash !== undefined) set.passwordHash = input.passwordHash;
  await db.update(admins).set(set).where(eq(admins.id, id));
}

export async function deleteAdmin(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(admins).where(eq(admins.id, id));
}

/** 设置管理员的单个角色（先删后插）。 */
export async function setAdminRole(adminId: string, roleId: string): Promise<void> {
  const db = await getDb();
  await db.delete(sysUserRoles).where(eq(sysUserRoles.adminId, adminId));
  await db.insert(sysUserRoles).values({ adminId, roleId });
}

/** 查询管理员的角色 ID 列表。 */
export async function getAdminRoleIds(adminId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .select({ roleId: sysUserRoles.roleId })
    .from(sysUserRoles)
    .where(eq(sysUserRoles.adminId, adminId));
  return rows.map((r) => r.roleId);
}

// ===== RBAC：菜单 =====

export interface SysMenuNode {
  id: string;
  parentId: string | null;
  name: string;
  path: string | null;
  icon: string | null;
  sortOrder: number;
  isVisible: boolean;
  children: SysMenuNode[];
}

export interface SysMenuRow {
  id: string;
  parentId: string | null;
  name: string;
  path: string | null;
  icon: string | null;
  sortOrder: number;
  isVisible: boolean;
}

function toMenuRow(r: typeof sysMenus.$inferSelect): SysMenuRow {
  return {
    id: r.id,
    parentId: r.parentId,
    name: r.name,
    path: r.path,
    icon: r.icon,
    sortOrder: r.sortOrder ?? 0,
    isVisible: (r.isVisible ?? 1) === 1,
  };
}

function buildMenuTree(menus: SysMenuRow[]): SysMenuNode[] {
  const map = new Map<string, SysMenuNode>();
  const roots: SysMenuNode[] = [];
  for (const m of menus) {
    map.set(m.id, { ...m, children: [] });
  }
  for (const m of menus) {
    const node = map.get(m.id)!;
    if (m.parentId && map.has(m.parentId)) {
      map.get(m.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

/** 全部菜单（扁平，按 sortOrder 升序）。 */
export async function listSysMenus(): Promise<SysMenuRow[]> {
  const db = await getDb();
  const rows = await db.select().from(sysMenus).orderBy(asc(sysMenus.sortOrder));
  return rows.map(toMenuRow);
}

/** 当前管理员可见的菜单树（按角色过滤，自动补全父级菜单）。 */
export async function getAdminMenuTree(adminId: string): Promise<SysMenuNode[]> {
  const db = await getDb();
  const userRoles = await db
    .select({ roleId: sysUserRoles.roleId })
    .from(sysUserRoles)
    .where(eq(sysUserRoles.adminId, adminId));
  if (userRoles.length === 0) return [];

  const roleIds = userRoles.map((r) => r.roleId);
  const roleMenuRows = await db
    .select({ menuId: sysRoleMenus.menuId })
    .from(sysRoleMenus)
    .where(inArray(sysRoleMenus.roleId, roleIds));
  if (roleMenuRows.length === 0) return [];

  const menuIds = Array.from(new Set(roleMenuRows.map((r) => r.menuId)));
  let rows = await db
    .select()
    .from(sysMenus)
    .where(inArray(sysMenus.id, menuIds))
    .orderBy(asc(sysMenus.sortOrder));

  // 自动补全缺失的父级菜单，保证树完整
  const currentIds = new Set(rows.map((r) => r.id));
  const missingParentIds = new Set<string>();
  for (const r of rows) {
    if (r.parentId && !currentIds.has(r.parentId)) {
      missingParentIds.add(r.parentId);
    }
  }
  if (missingParentIds.size > 0) {
    const parentRows = await db
      .select()
      .from(sysMenus)
      .where(inArray(sysMenus.id, Array.from(missingParentIds)))
      .orderBy(asc(sysMenus.sortOrder));
    rows = [...parentRows, ...rows];
  }

  rows.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return buildMenuTree(rows.map(toMenuRow));
}

export async function createSysMenu(input: {
  name: string;
  path?: string | null;
  parentId?: string | null;
  icon?: string | null;
  sortOrder?: number;
  isVisible?: boolean;
}): Promise<string> {
  const db = await getDb();
  const [row] = await db
    .insert(sysMenus)
    .values({
      name: input.name,
      path: input.path ?? null,
      parentId: input.parentId ?? null,
      icon: input.icon ?? null,
      sortOrder: input.sortOrder ?? 0,
      isVisible: input.isVisible === false ? 0 : 1,
    })
    .returning({ id: sysMenus.id });
  return row!.id;
}

export async function updateSysMenu(
  id: string,
  input: Partial<{
    name: string;
    path: string | null;
    parentId: string | null;
    icon: string | null;
    sortOrder: number;
    isVisible: boolean;
  }>,
): Promise<void> {
  const db = await getDb();
  const set: Record<string, unknown> = { updatedAt: Math.floor(Date.now() / 1000) };
  if (input.name !== undefined) set.name = input.name;
  if (input.path !== undefined) set.path = input.path;
  if (input.parentId !== undefined) set.parentId = input.parentId;
  if (input.icon !== undefined) set.icon = input.icon;
  if (input.sortOrder !== undefined) set.sortOrder = input.sortOrder;
  if (input.isVisible !== undefined) set.isVisible = input.isVisible ? 1 : 0;
  await db.update(sysMenus).set(set).where(eq(sysMenus.id, id));
}

export async function deleteSysMenu(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(sysMenus).where(eq(sysMenus.id, id));
}

// ===== RBAC：角色 =====

export interface AdminRole {
  id: string;
  name: string;
  code: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  menuIds: string[];
  createdAt: string;
}

export async function listSysRoles(): Promise<AdminRole[]> {
  const db = await getDb();
  const rows = await db.select().from(sysRoles).orderBy(asc(sysRoles.sortOrder));
  if (rows.length === 0) return [];

  const roleIds = rows.map((r) => r.id);
  const rmRows = await db
    .select({ roleId: sysRoleMenus.roleId, menuId: sysRoleMenus.menuId })
    .from(sysRoleMenus)
    .where(inArray(sysRoleMenus.roleId, roleIds));
  const map = new Map<string, string[]>();
  for (const rm of rmRows) {
    const arr = map.get(rm.roleId) ?? [];
    arr.push(rm.menuId);
    map.set(rm.roleId, arr);
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    description: r.description ?? "",
    sortOrder: r.sortOrder ?? 0,
    isActive: (r.isActive ?? 1) === 1,
    menuIds: map.get(r.id) ?? [],
    createdAt: toIso(r.createdAt),
  }));
}

export async function createSysRole(input: {
  name: string;
  code: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<string> {
  const db = await getDb();
  const [row] = await db
    .insert(sysRoles)
    .values({
      name: input.name,
      code: input.code,
      description: input.description ?? "",
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive === false ? 0 : 1,
    })
    .returning({ id: sysRoles.id });
  return row!.id;
}

export async function updateSysRole(
  id: string,
  input: Partial<{
    name: string;
    code: string;
    description: string;
    sortOrder: number;
    isActive: boolean;
  }>,
): Promise<void> {
  const db = await getDb();
  const set: Record<string, unknown> = { updatedAt: Math.floor(Date.now() / 1000) };
  if (input.name !== undefined) set.name = input.name;
  if (input.code !== undefined) set.code = input.code;
  if (input.description !== undefined) set.description = input.description;
  if (input.sortOrder !== undefined) set.sortOrder = input.sortOrder;
  if (input.isActive !== undefined) set.isActive = input.isActive ? 1 : 0;
  await db.update(sysRoles).set(set).where(eq(sysRoles.id, id));
}

export async function deleteSysRole(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(sysRoles).where(eq(sysRoles.id, id));
}

/** 设置角色的菜单权限（先删后插）。 */
export async function setRoleMenus(roleId: string, menuIds: string[]): Promise<void> {
  const db = await getDb();
  await db.delete(sysRoleMenus).where(eq(sysRoleMenus.roleId, roleId));
  if (menuIds.length > 0) {
    await db.insert(sysRoleMenus).values(menuIds.map((menuId) => ({ roleId, menuId })));
  }
}

// ===== 系统配置 =====

export interface SettingRow {
  id: string;
  key: string;
  value: string;
  remark: string;
  updatedAt: string;
}

export async function listSettings(): Promise<SettingRow[]> {
  const db = await getDb();
  const rows = await db.select().from(settings).orderBy(asc(settings.key));
  return rows.map((r) => ({
    id: r.id,
    key: r.key,
    value: r.value ?? "",
    remark: r.remark ?? "",
    updatedAt: toIso(r.updatedAt),
  }));
}

export async function createSetting(input: {
  key: string;
  value?: string;
  remark?: string;
}): Promise<string> {
  const db = await getDb();
  const [row] = await db
    .insert(settings)
    .values({
      key: input.key,
      value: input.value ?? "",
      remark: input.remark ?? "",
    })
    .returning({ id: settings.id });
  return row!.id;
}

export async function updateSetting(
  id: string,
  input: Partial<{ key: string; value: string; remark: string }>,
): Promise<void> {
  const db = await getDb();
  const set: Record<string, unknown> = { updatedAt: Math.floor(Date.now() / 1000) };
  if (input.key !== undefined) set.key = input.key;
  if (input.value !== undefined) set.value = input.value;
  if (input.remark !== undefined) set.remark = input.remark;
  await db.update(settings).set(set).where(eq(settings.id, id));
}

export async function deleteSetting(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(settings).where(eq(settings.id, id));
}

// ===== 操作日志查询 =====

export interface AuditLogRow {
  id: string;
  action: string;
  resource: string | null;
  targetType: string;
  targetId: string;
  meta: string;
  operatorId: string | null;
  operatorUsername: string | null;
  operatorIp: string;
  createdAt: string;
}

export async function listAuditLogs(opts: {
  page: number;
  pageSize: number;
  resource?: string;
  action?: string;
  user?: string;
}): Promise<{ items: AuditLogRow[]; total: number }> {
  const db = await getDb();
  const conditions = [];
  if (opts.resource && opts.resource !== "all") {
    conditions.push(eq(adminOperationLogs.resource, opts.resource));
  }
  if (opts.action && opts.action !== "all") {
    conditions.push(eq(adminOperationLogs.action, opts.action));
  }
  if (opts.user) {
    conditions.push(like(adminOperationLogs.operatorUsername, `%${opts.user}%`));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(adminOperationLogs)
      .where(where)
      .orderBy(desc(adminOperationLogs.createdAt))
      .limit(opts.pageSize)
      .offset((opts.page - 1) * opts.pageSize),
    db.select({ value: count() }).from(adminOperationLogs).where(where),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      action: r.action,
      resource: r.resource,
      targetType: r.targetType,
      targetId: r.targetId,
      meta: r.meta,
      operatorId: r.operatorId,
      operatorUsername: r.operatorUsername,
      operatorIp: r.operatorIp,
      createdAt: toIso(r.createdAt),
    })),
    total: totalRows[0]?.value ?? 0,
  };
}

// ===== 内容组织：分类 / 标签 / 专题 =====

const EMPTY_TAXONOMY_LOCALE: TaxonomyLocale = {
  en: { name: "", description: "", seoTitle: "", seoDescription: "" },
  zh: { name: "", description: "", seoTitle: "", seoDescription: "" },
};

function toAdminCategory(row: typeof categories.$inferSelect): AdminCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    locale: (row.locale ?? EMPTY_TAXONOMY_LOCALE) as TaxonomyLocale,
    icon: row.icon ?? "",
    coverImage: row.coverImage ?? "",
    color: row.color ?? "",
    sortOrder: row.sortOrder ?? 0,
    isVisible: (row.isVisible ?? 1) === 1,
    gameCount: row.gameCount ?? 0,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function toAdminTag(row: typeof tags.$inferSelect): AdminTag {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    locale: (row.locale ?? EMPTY_TAXONOMY_LOCALE) as TaxonomyLocale,
    icon: row.icon ?? "",
    color: row.color ?? "",
    sortOrder: row.sortOrder ?? 0,
    isVisible: (row.isVisible ?? 1) === 1,
    gameCount: row.gameCount ?? 0,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function toAdminCollection(row: typeof collections.$inferSelect, gameCount = 0): AdminCollection {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    locale: (row.locale ?? EMPTY_TAXONOMY_LOCALE) as TaxonomyLocale,
    icon: row.icon ?? "",
    coverImage: row.coverImage ?? "",
    layout: (row.layout ?? "grid") as CollectionLayout,
    sortOrder: row.sortOrder ?? 0,
    isVisible: (row.isVisible ?? 1) === 1,
    gameCount,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function toPublicCategory(row: typeof categories.$inferSelect, locale: Locale): PublicCategory {
  const loc = (row.locale ?? EMPTY_TAXONOMY_LOCALE) as TaxonomyLocale;
  const l = loc[locale] ?? loc.en;
  return {
    id: row.id,
    slug: row.slug,
    name: l.name || loc.en.name || row.name,
    description: l.description || loc.en.description || "",
    seoTitle: l.seoTitle || loc.en.seoTitle || "",
    seoDescription: l.seoDescription || loc.en.seoDescription || "",
    icon: row.icon ?? "",
    coverImage: row.coverImage ?? "",
    color: row.color ?? "",
    gameCount: row.gameCount ?? 0,
  };
}

function toPublicTag(row: typeof tags.$inferSelect, locale: Locale): PublicTag {
  const loc = (row.locale ?? EMPTY_TAXONOMY_LOCALE) as TaxonomyLocale;
  const l = loc[locale] ?? loc.en;
  return {
    id: row.id,
    slug: row.slug,
    name: l.name || loc.en.name || row.name,
    description: l.description || loc.en.description || "",
    seoTitle: l.seoTitle || loc.en.seoTitle || "",
    seoDescription: l.seoDescription || loc.en.seoDescription || "",
    icon: row.icon ?? "",
    color: row.color ?? "",
    gameCount: row.gameCount ?? 0,
  };
}

function toPublicCollection(row: typeof collections.$inferSelect, locale: Locale, gameCount = 0): PublicCollection {
  const loc = (row.locale ?? EMPTY_TAXONOMY_LOCALE) as TaxonomyLocale;
  const l = loc[locale] ?? loc.en;
  return {
    id: row.id,
    slug: row.slug,
    name: l.name || loc.en.name || row.name,
    description: l.description || loc.en.description || "",
    seoTitle: l.seoTitle || loc.en.seoTitle || "",
    seoDescription: l.seoDescription || loc.en.seoDescription || "",
    icon: row.icon ?? "",
    coverImage: row.coverImage ?? "",
    layout: (row.layout ?? "grid") as CollectionLayout,
    gameCount,
  };
}

// ─── 分类 CRUD ───────────────────────────────────────────────

export async function listAdminCategories(opts: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<{ items: AdminCategory[]; total: number }> {
  const db = await getDb();
  const conditions = [];
  if (opts.search) {
    conditions.push(like(categories.name, `%${opts.search}%`));
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, totalRows] = await Promise.all([
    db.select().from(categories).where(where).orderBy(asc(categories.sortOrder), desc(categories.createdAt)).limit(opts.pageSize).offset((opts.page - 1) * opts.pageSize),
    db.select({ value: count() }).from(categories).where(where),
  ]);
  return { items: rows.map(toAdminCategory), total: totalRows[0]?.value ?? 0 };
}

export async function getAdminCategory(id: string): Promise<AdminCategory | null> {
  const db = await getDb();
  const row = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return row[0] ? toAdminCategory(row[0]) : null;
}

export async function getAdminCategoryBySlug(slug: string): Promise<AdminCategory | null> {
  const db = await getDb();
  const row = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return row[0] ? toAdminCategory(row[0]) : null;
}

export async function createCategory(input: {
  slug: string;
  name: string;
  locale?: TaxonomyLocale;
  icon?: string;
  coverImage?: string;
  color?: string;
  sortOrder?: number;
  isVisible?: boolean;
}): Promise<AdminCategory> {
  const db = await getDb();
  const [row] = await db
    .insert(categories)
    .values({
      slug: input.slug,
      name: input.name,
      locale: input.locale ?? EMPTY_TAXONOMY_LOCALE,
      icon: input.icon ?? "",
      coverImage: input.coverImage ?? "",
      color: input.color ?? "",
      sortOrder: input.sortOrder ?? 0,
      isVisible: input.isVisible === false ? 0 : 1,
    })
    .returning();
  return toAdminCategory(row!);
}

export async function updateCategory(
  id: string,
  input: Partial<{
    slug: string;
    name: string;
    locale: TaxonomyLocale;
    icon: string;
    coverImage: string;
    color: string;
    sortOrder: number;
    isVisible: boolean;
  }>,
): Promise<AdminCategory | null> {
  const db = await getDb();
  const set: Record<string, unknown> = { updatedAt: Math.floor(Date.now() / 1000) };
  if (input.slug !== undefined) set.slug = input.slug;
  if (input.name !== undefined) set.name = input.name;
  if (input.locale !== undefined) set.locale = input.locale;
  if (input.icon !== undefined) set.icon = input.icon;
  if (input.coverImage !== undefined) set.coverImage = input.coverImage;
  if (input.color !== undefined) set.color = input.color;
  if (input.sortOrder !== undefined) set.sortOrder = input.sortOrder;
  if (input.isVisible !== undefined) set.isVisible = input.isVisible ? 1 : 0;
  const [row] = await db.update(categories).set(set).where(eq(categories.id, id)).returning();
  return row ? toAdminCategory(row) : null;
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  await db.update(games).set({ categoryId: null }).where(eq(games.categoryId, id));
  await db.delete(categories).where(eq(categories.id, id));
}

/** 重算分类下的游戏数（缓存到 gameCount 字段）。 */
export async function recalcCategoryGameCount(id: string): Promise<void> {
  const db = await getDb();
  const row = await db.select({ value: count() }).from(games).where(and(eq(games.categoryId, id), eq(games.status, "published")));
  await db.update(categories).set({ gameCount: row[0]?.value ?? 0 }).where(eq(categories.id, id));
}

// ─── 分类 C 端查询 ───────────────────────────────────────────

export async function listPublicCategories(locale: Locale): Promise<PublicCategory[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.isVisible, 1))
    .orderBy(asc(categories.sortOrder), desc(categories.createdAt));
  return rows.map((r) => toPublicCategory(r, locale));
}

export async function getPublicCategoryBySlug(slug: string, locale: Locale): Promise<PublicCategory | null> {
  const db = await getDb();
  const row = await db.select().from(categories).where(and(eq(categories.slug, slug), eq(categories.isVisible, 1))).limit(1);
  return row[0] ? toPublicCategory(row[0], locale) : null;
}

export async function listGamesByCategory(
  categorySlug: string,
  opts: { page: number; pageSize: number; sort?: "popular" | "newest" },
  locale: Locale,
): Promise<{ items: PublicGame[]; total: number; category: PublicCategory | null }> {
  const db = await getDb();
  const cat = await db.select().from(categories).where(eq(categories.slug, categorySlug)).limit(1);
  if (!cat[0]) return { items: [], total: 0, category: null };
  const category = toPublicCategory(cat[0], locale);
  const where = and(eq(games.categoryId, cat[0].id), eq(games.status, "published"));
  const order = opts.sort === "popular" ? desc(games.playCount) : desc(games.createdAt);
  const [rows, totalRows] = await Promise.all([
    db.select().from(games).where(where).orderBy(order).limit(opts.pageSize).offset((opts.page - 1) * opts.pageSize),
    db.select({ value: count() }).from(games).where(where),
  ]);
  return {
    items: await Promise.all(rows.map((r) => toPublicGame(r, locale))),
    total: totalRows[0]?.value ?? 0,
    category,
  };
}

// ─── 标签 CRUD ───────────────────────────────────────────────

export async function listAdminTags(opts: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<{ items: AdminTag[]; total: number }> {
  const db = await getDb();
  const conditions = [];
  if (opts.search) {
    conditions.push(like(tags.name, `%${opts.search}%`));
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, totalRows] = await Promise.all([
    db.select().from(tags).where(where).orderBy(asc(tags.sortOrder), desc(tags.createdAt)).limit(opts.pageSize).offset((opts.page - 1) * opts.pageSize),
    db.select({ value: count() }).from(tags).where(where),
  ]);
  return { items: rows.map(toAdminTag), total: totalRows[0]?.value ?? 0 };
}

export async function getAdminTag(id: string): Promise<AdminTag | null> {
  const db = await getDb();
  const row = await db.select().from(tags).where(eq(tags.id, id)).limit(1);
  return row[0] ? toAdminTag(row[0]) : null;
}

export async function getAdminTagBySlug(slug: string): Promise<AdminTag | null> {
  const db = await getDb();
  const row = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1);
  return row[0] ? toAdminTag(row[0]) : null;
}

export async function createTag(input: {
  slug: string;
  name: string;
  locale?: TaxonomyLocale;
  icon?: string;
  color?: string;
  sortOrder?: number;
  isVisible?: boolean;
}): Promise<AdminTag> {
  const db = await getDb();
  const [row] = await db
    .insert(tags)
    .values({
      slug: input.slug,
      name: input.name,
      locale: input.locale ?? EMPTY_TAXONOMY_LOCALE,
      icon: input.icon ?? "",
      color: input.color ?? "",
      sortOrder: input.sortOrder ?? 0,
      isVisible: input.isVisible === false ? 0 : 1,
    })
    .returning();
  return toAdminTag(row!);
}

export async function updateTag(
  id: string,
  input: Partial<{
    slug: string;
    name: string;
    locale: TaxonomyLocale;
    icon: string;
    color: string;
    sortOrder: number;
    isVisible: boolean;
  }>,
): Promise<AdminTag | null> {
  const db = await getDb();
  const set: Record<string, unknown> = { updatedAt: Math.floor(Date.now() / 1000) };
  if (input.slug !== undefined) set.slug = input.slug;
  if (input.name !== undefined) set.name = input.name;
  if (input.locale !== undefined) set.locale = input.locale;
  if (input.icon !== undefined) set.icon = input.icon;
  if (input.color !== undefined) set.color = input.color;
  if (input.sortOrder !== undefined) set.sortOrder = input.sortOrder;
  if (input.isVisible !== undefined) set.isVisible = input.isVisible ? 1 : 0;
  const [row] = await db.update(tags).set(set).where(eq(tags.id, id)).returning();
  return row ? toAdminTag(row) : null;
}

export async function deleteTag(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(tags).where(eq(tags.id, id));
}

/** 重算标签关联的游戏数。 */
export async function recalcTagGameCount(id: string): Promise<void> {
  const db = await getDb();
  const rows = await db
    .select({ gameId: gameTags.gameId })
    .from(gameTags)
    .where(eq(gameTags.tagId, id));
  const gameIds = rows.map((r) => r.gameId);
  let publishedCount = 0;
  if (gameIds.length > 0) {
    const c = await db.select({ value: count() }).from(games).where(and(inArray(games.id, gameIds), eq(games.status, "published")));
    publishedCount = c[0]?.value ?? 0;
  }
  await db.update(tags).set({ gameCount: publishedCount }).where(eq(tags.id, id));
}

// ─── 标签 C 端查询 ───────────────────────────────────────────

export async function listPublicTags(locale: Locale): Promise<PublicTag[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(tags)
    .where(eq(tags.isVisible, 1))
    .orderBy(asc(tags.sortOrder), desc(tags.createdAt));
  return rows.map((r) => toPublicTag(r, locale));
}

export async function getPublicTagBySlug(slug: string, locale: Locale): Promise<PublicTag | null> {
  const db = await getDb();
  const row = await db.select().from(tags).where(and(eq(tags.slug, slug), eq(tags.isVisible, 1))).limit(1);
  return row[0] ? toPublicTag(row[0], locale) : null;
}

export async function listGamesByTag(
  tagSlug: string,
  opts: { page: number; pageSize: number; sort?: "popular" | "newest" },
  locale: Locale,
): Promise<{ items: PublicGame[]; total: number; tag: PublicTag | null }> {
  const db = await getDb();
  const tagRow = await db.select().from(tags).where(eq(tags.slug, tagSlug)).limit(1);
  if (!tagRow[0]) return { items: [], total: 0, tag: null };
  const tag = toPublicTag(tagRow[0], locale);

  const gameTagRows = await db.select({ gameId: gameTags.gameId }).from(gameTags).where(eq(gameTags.tagId, tagRow[0].id));
  const gameIds = gameTagRows.map((r) => r.gameId);
  if (gameIds.length === 0) return { items: [], total: 0, tag };

  const where = and(inArray(games.id, gameIds), eq(games.status, "published"));
  const order = opts.sort === "popular" ? desc(games.playCount) : desc(games.createdAt);
  const [rows, totalRows] = await Promise.all([
    db.select().from(games).where(where).orderBy(order).limit(opts.pageSize).offset((opts.page - 1) * opts.pageSize),
    db.select({ value: count() }).from(games).where(where),
  ]);
  return {
    items: await Promise.all(rows.map((r) => toPublicGame(r, locale))),
    total: totalRows[0]?.value ?? 0,
    tag,
  };
}

// ─── 专题 CRUD ───────────────────────────────────────────────

export async function listAdminCollections(opts: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<{ items: AdminCollection[]; total: number }> {
  const db = await getDb();
  const conditions = [];
  if (opts.search) {
    conditions.push(like(collections.name, `%${opts.search}%`));
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, totalRows] = await Promise.all([
    db.select().from(collections).where(where).orderBy(asc(collections.sortOrder), desc(collections.createdAt)).limit(opts.pageSize).offset((opts.page - 1) * opts.pageSize),
    db.select({ value: count() }).from(collections).where(where),
  ]);

  const collectionIds = rows.map((r) => r.id);
  const countMap = new Map<string, number>();
  if (collectionIds.length > 0) {
    const gcRows = await db
      .select({ collectionId: gameCollections.collectionId, gameId: gameCollections.gameId })
      .from(gameCollections)
      .where(inArray(gameCollections.collectionId, collectionIds));
    const gameIdSet = new Set(gcRows.map((r) => r.gameId));
    const pubMap = new Map<string, number>();
    if (gameIdSet.size > 0) {
      const pubRows = await db
        .select({ id: games.id })
        .from(games)
        .where(and(inArray(games.id, Array.from(gameIdSet)), eq(games.status, "published")));
      for (const r of pubRows) pubMap.set(r.id, 1);
    }
    for (const r of gcRows) {
      const gid = r.gameId;
      if (pubMap.has(gid)) {
        countMap.set(r.collectionId, (countMap.get(r.collectionId) ?? 0) + 1);
      }
    }
  }

  return {
    items: rows.map((r) => toAdminCollection(r, countMap.get(r.id) ?? 0)),
    total: totalRows[0]?.value ?? 0,
  };
}

export async function getAdminCollection(id: string): Promise<AdminCollection | null> {
  const db = await getDb();
  const row = await db.select().from(collections).where(eq(collections.id, id)).limit(1);
  if (!row[0]) return null;
  const gcRows = await db.select({ gameId: gameCollections.gameId }).from(gameCollections).where(eq(gameCollections.collectionId, id));
  const gameIds = gcRows.map((r) => r.gameId);
  let gameCount = 0;
  if (gameIds.length > 0) {
    const c = await db.select({ value: count() }).from(games).where(and(inArray(games.id, gameIds), eq(games.status, "published")));
    gameCount = c[0]?.value ?? 0;
  }
  return toAdminCollection(row[0], gameCount);
}

export async function getAdminCollectionBySlug(slug: string): Promise<AdminCollection | null> {
  const db = await getDb();
  const row = await db.select().from(collections).where(eq(collections.slug, slug)).limit(1);
  if (!row[0]) return null;
  return toAdminCollection(row[0], 0);
}

export async function createCollection(input: {
  slug: string;
  name: string;
  locale?: TaxonomyLocale;
  icon?: string;
  coverImage?: string;
  layout?: CollectionLayout;
  sortOrder?: number;
  isVisible?: boolean;
}): Promise<AdminCollection> {
  const db = await getDb();
  const [row] = await db
    .insert(collections)
    .values({
      slug: input.slug,
      name: input.name,
      locale: input.locale ?? EMPTY_TAXONOMY_LOCALE,
      icon: input.icon ?? "",
      coverImage: input.coverImage ?? "",
      layout: input.layout ?? "grid",
      sortOrder: input.sortOrder ?? 0,
      isVisible: input.isVisible === false ? 0 : 1,
    })
    .returning();
  return toAdminCollection(row!, 0);
}

export async function updateCollection(
  id: string,
  input: Partial<{
    slug: string;
    name: string;
    locale: TaxonomyLocale;
    icon: string;
    coverImage: string;
    layout: CollectionLayout;
    sortOrder: number;
    isVisible: boolean;
  }>,
): Promise<AdminCollection | null> {
  const db = await getDb();
  const set: Record<string, unknown> = { updatedAt: Math.floor(Date.now() / 1000) };
  if (input.slug !== undefined) set.slug = input.slug;
  if (input.name !== undefined) set.name = input.name;
  if (input.locale !== undefined) set.locale = input.locale;
  if (input.icon !== undefined) set.icon = input.icon;
  if (input.coverImage !== undefined) set.coverImage = input.coverImage;
  if (input.layout !== undefined) set.layout = input.layout;
  if (input.sortOrder !== undefined) set.sortOrder = input.sortOrder;
  if (input.isVisible !== undefined) set.isVisible = input.isVisible ? 1 : 0;
  const [row] = await db.update(collections).set(set).where(eq(collections.id, id)).returning();
  return row ? toAdminCollection(row, 0) : null;
}

export async function deleteCollection(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(collections).where(eq(collections.id, id));
}

// ─── 专题 C 端查询 ───────────────────────────────────────────

export async function listPublicCollections(locale: Locale): Promise<PublicCollection[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(collections)
    .where(eq(collections.isVisible, 1))
    .orderBy(asc(collections.sortOrder), desc(collections.createdAt));

  const collectionIds = rows.map((r) => r.id);
  const countMap = new Map<string, number>();
  if (collectionIds.length > 0) {
    const gcRows = await db
      .select({ collectionId: gameCollections.collectionId, gameId: gameCollections.gameId })
      .from(gameCollections)
      .where(inArray(gameCollections.collectionId, collectionIds));
    const gameIdSet = new Set(gcRows.map((r) => r.gameId));
    const pubMap = new Set<string>();
    if (gameIdSet.size > 0) {
      const pubRows = await db
        .select({ id: games.id })
        .from(games)
        .where(and(inArray(games.id, Array.from(gameIdSet)), eq(games.status, "published")));
      for (const r of pubRows) pubMap.add(r.id);
    }
    for (const r of gcRows) {
      if (pubMap.has(r.gameId)) {
        countMap.set(r.collectionId, (countMap.get(r.collectionId) ?? 0) + 1);
      }
    }
  }

  return rows.map((r) => toPublicCollection(r, locale, countMap.get(r.id) ?? 0));
}

export async function getPublicCollectionBySlug(slug: string, locale: Locale): Promise<PublicCollection | null> {
  const db = await getDb();
  const row = await db.select().from(collections).where(and(eq(collections.slug, slug), eq(collections.isVisible, 1))).limit(1);
  if (!row[0]) return null;
  const gcRows = await db.select({ gameId: gameCollections.gameId }).from(gameCollections).where(eq(gameCollections.collectionId, row[0].id));
  const gameIds = gcRows.map((r) => r.gameId);
  let gameCount = 0;
  if (gameIds.length > 0) {
    const c = await db.select({ value: count() }).from(games).where(and(inArray(games.id, gameIds), eq(games.status, "published")));
    gameCount = c[0]?.value ?? 0;
  }
  return toPublicCollection(row[0], locale, gameCount);
}

export async function listGamesByCollection(
  collectionSlug: string,
  opts: { page: number; pageSize: number },
  locale: Locale,
): Promise<{ items: PublicGame[]; total: number; collection: PublicCollection | null }> {
  const db = await getDb();
  const colRow = await db.select().from(collections).where(eq(collections.slug, collectionSlug)).limit(1);
  if (!colRow[0]) return { items: [], total: 0, collection: null };

  const gcRows = await db
    .select({ gameId: gameCollections.gameId, sortOrder: gameCollections.sortOrder })
    .from(gameCollections)
    .where(eq(gameCollections.collectionId, colRow[0].id))
    .orderBy(asc(gameCollections.sortOrder), desc(gameCollections.createdAt));
  const gameIds = gcRows.map((r) => r.gameId);
  if (gameIds.length === 0) {
    return { items: [], total: 0, collection: toPublicCollection(colRow[0], locale, 0) };
  }

  const where = and(inArray(games.id, gameIds), eq(games.status, "published"));
  const [rows, totalRows] = await Promise.all([
    db.select().from(games).where(where).orderBy(desc(games.createdAt)).limit(opts.pageSize).offset((opts.page - 1) * opts.pageSize),
    db.select({ value: count() }).from(games).where(where),
  ]);

  const sortOrderMap = new Map<string, number>();
  gcRows.forEach((r, i) => { if (!sortOrderMap.has(r.gameId)) sortOrderMap.set(r.gameId, i); });
  const items = await Promise.all(rows.map((r) => toPublicGame(r, locale)));
  items.sort((a, b) => (sortOrderMap.get(a.id) ?? 0) - (sortOrderMap.get(b.id) ?? 0));

  return {
    items,
    total: totalRows[0]?.value ?? 0,
    collection: toPublicCollection(colRow[0], locale, totalRows[0]?.value ?? 0),
  };
}

// ─── 游戏关联查询（供 B 端表单使用） ─────────────────────────

export async function listAllCategoriesForPicker(): Promise<
  { id: string; slug: string; name: string; color: string | null }[]
> {
  const db = await getDb();
  const rows = await db
    .select({ id: categories.id, slug: categories.slug, name: categories.name, color: categories.color })
    .from(categories)
    .orderBy(asc(categories.sortOrder), desc(categories.createdAt));
  return rows;
}

export async function listAllTagsForPicker(): Promise<
  { id: string; slug: string; name: string; color: string | null }[]
> {
  const db = await getDb();
  const rows = await db
    .select({ id: tags.id, slug: tags.slug, name: tags.name, color: tags.color })
    .from(tags)
    .orderBy(asc(tags.sortOrder), desc(tags.createdAt));
  return rows;
}

export async function listAllCollectionsForPicker(): Promise<
  { id: string; slug: string; name: string }[]
> {
  const db = await getDb();
  const rows = await db
    .select({ id: collections.id, slug: collections.slug, name: collections.name })
    .from(collections)
    .orderBy(asc(collections.sortOrder), desc(collections.createdAt));
  return rows;
}

export { schema, asc };
