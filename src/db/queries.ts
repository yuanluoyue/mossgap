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
} from "./schema";
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
function toIso(seconds: number | null | undefined): string {
  if (!seconds) return "";
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
  let roleMap = new Map<string, { roleId: string; roleName: string; roleCode: string }>();
  if (adminIds.length > 0) {
    const userRoleRows = await db
      .select({
        adminId: sysUserRoles.adminId,
        roleId: sysUserRoles.roleId,
      })
      .from(sysUserRoles)
      .where(inArray(sysUserRoles.adminId, adminIds));
    const roleIds = Array.from(new Set(userRoleRows.map((r) => r.roleId)));
    let roleInfoMap = new Map<string, { name: string; code: string }>();
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

export { schema, asc };
