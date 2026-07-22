import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type { GameLocale, TaxonomyLocale, CollectionLayout } from "@/types";

/** 生成 UUID（兼容 Cloudflare Workers 与 Node.js 环境）。 */
function genUuid(): string {
  // crypto.randomUUID 在 Workers 与 Node.js 18+ 均可用
  return crypto.randomUUID();
}

/** 当前 Unix 秒。 */
function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/** 管理员表 */
export const admins = sqliteTable(
  "admins",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(genUuid),
    username: text("username").notNull(),
    // PBKDF2 哈希后的密码（base64），格式：pbkdf2$<iterations>$<salt>$<hash>
    passwordHash: text("password_hash").notNull(),
    // 新增可空字段（向前兼容）：邮箱 / 昵称 / 头像 / 启用状态（0/1）
    email: text("email"),
    name: text("name"),
    avatar: text("avatar"),
    isActive: integer("is_active").default(1),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(nowSeconds),
    updatedAt: integer("updated_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    usernameIdx: uniqueIndex("admins_username_idx").on(t.username),
  }),
);

/** 游戏表 */
export const games = sqliteTable(
  "games",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(genUuid),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    coverImage: text("cover_image").notNull().default(""),
    screenshots: text("screenshots", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    entryFile: text("entry_file").notNull().default("index.html"),
    ossPrefix: text("oss_prefix").notNull(),
    status: text("status", {
      enum: ["draft", "published", "archived"],
    })
      .notNull()
      .default("draft"),
    locale: text("locale", { mode: "json" })
      .$type<GameLocale>()
      .notNull()
      .default({ en: { title: "", description: "" }, zh: { title: "", description: "" } }),
    // 新增字段（均 nullable 以保持向前兼容，应用层兜底默认值）
    sourceType: text("source_type", { enum: ["zip", "iframe"] }).default("zip"),
    iframeUrl: text("iframe_url").default(""),
    ossSize: integer("oss_size").default(0),
    // 内部备注（仅 B 端展示，nullable 向前兼容）
    internalNotes: text("internal_notes").default(""),
    likeCount: integer("like_count").default(0),
    dislikeCount: integer("dislike_count").default(0),
    // 关联分类表（nullable 向前兼容）
    categoryId: text("category_id"),
    // 上传者（关联 admins 表，nullable 向前兼容，旧数据为空）
    uploaderId: text("uploader_id"),
    // 角标（JSON 数组字符串，可选值：new/hot；nullable 向前兼容，应用层兜底为 []）
    // 注意：故意不用 { mode: "json" }，因为 D1 .raw() 在 schema 演进时
    // 会把列名当成值传给 drizzle 的 JSON.parse，导致 "badge" is not valid JSON。
    // 改成 plain text + 应用层手动 parse/stringify 绕过此问题。
    badge: text("badge").default("[]"),
    // 排序权重（数值越大越靠前；nullable 向前兼容，应用层兜底为 0）
    weight: integer("weight").default(0),
    // 发布时间（Unix 秒；nullable 向前兼容，未发布时为 null）
    publishedAt: integer("published_at"),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(nowSeconds),
    updatedAt: integer("updated_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    slugIdx: uniqueIndex("games_slug_idx").on(t.slug),
    statusIdx: index("games_status_idx").on(t.status),
    categoryIdIdx: index("games_category_id_idx").on(t.categoryId),
    uploaderIdIdx: index("games_uploader_id_idx").on(t.uploaderId),
    weightIdx: index("games_weight_idx").on(t.weight),
    publishedAtIdx: index("games_published_at_idx").on(t.publishedAt),
  }),
);

/**
 * 游戏详情内容表（按 locale 区分，用于攻略/SEO 长尾词）。
 * 一个游戏对应两条记录：en + zh。复合主键 (gameId, locale)。
 * 所有内容字段均 nullable 向前兼容，应用层兜底为空字符串/空数组。
 */
export const gameContents = sqliteTable(
  "game_contents",
  {
    id: text("id")
      .notNull()
      .$defaultFn(genUuid),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(), // "en" | "zh"
    /** 摘要（短文本） */
    summary: text("summary").default(""),
    /** 玩法说明（富文本 HTML） */
    howToPlay: text("how_to_play").default(""),
    /** 技巧（富文本 HTML） */
    tips: text("tips").default(""),
    /** 操作说明（富文本 HTML） */
    controls: text("controls").default(""),
    /**
     * FAQ（JSON 数组字符串 [{question, answer}]）。
     * 故意不用 { mode: "json" }，避免 D1 .raw() schema 演进 bug（参考 badge 字段）。
     * 应用层手动 parse/stringify。
     */
    faq: text("faq").default("[]"),
    /** SEO 标题 */
    seoTitle: text("seo_title").default(""),
    /** SEO 描述 */
    seoDescription: text("seo_description").default(""),
    /** SEO 关键词（逗号分隔字符串） */
    keywords: text("keywords").default(""),
    /** canonical URL */
    canonical: text("canonical").default(""),
    updatedAt: integer("updated_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    // 复合主键：一个游戏每个 locale 只有一条记录
    pk: primaryKey({ columns: [t.gameId, t.locale] }),
    gameIdIdx: index("game_contents_game_id_idx").on(t.gameId),
  }),
);

/** 游戏点赞表（按 IP 去重，匿名用户） */
export const gameLikes = sqliteTable(
  "game_likes",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(genUuid),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    userIp: text("user_ip").notNull().default(""),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    gameIdx: index("likes_game_idx").on(t.gameId),
    gameIpIdx: uniqueIndex("likes_game_ip_idx").on(t.gameId, t.userIp),
  }),
);

/** 游戏点踩表（按 IP 去重，匿名用户） */
export const gameDislikes = sqliteTable(
  "game_dislikes",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(genUuid),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    userIp: text("user_ip").notNull().default(""),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    gameIdx: index("dislikes_game_idx").on(t.gameId),
    gameIpIdx: uniqueIndex("dislikes_game_ip_idx").on(t.gameId, t.userIp),
  }),
);

/** 管理员操作日志表（敏感操作留痕） */
export const adminOperationLogs = sqliteTable(
  "admin_operation_logs",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(genUuid),
    action: text("action").notNull(),
    targetType: text("target_type").notNull().default("game"),
    targetId: text("target_id").notNull().default(""),
    meta: text("meta").notNull().default("{}"),
    operatorIp: text("operator_ip").notNull().default(""),
    operatorUseragent: text("operator_useragent").notNull().default(""),
    // 新增可空字段（向前兼容）：操作人 ID / 操作人用户名 / 资源类型（menus/roles/users 等）
    operatorId: text("operator_id"),
    operatorUsername: text("operator_username"),
    resource: text("resource"),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    actionIdx: index("op_logs_action_idx").on(t.action),
    targetIdx: index("op_logs_target_idx").on(t.targetType, t.targetId),
    createdIdx: index("op_logs_created_idx").on(t.createdAt),
    resourceIdx: index("op_logs_resource_idx").on(t.resource),
    operatorIdx: index("op_logs_operator_idx").on(t.operatorId),
  }),
);

/** 用户反馈表（游戏反馈 / 平台反馈） */
export const feedbacks = sqliteTable(
  "feedbacks",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(genUuid),
    // 反馈类型：game 游戏反馈 / platform 平台反馈
    type: text("type", { enum: ["game", "platform"] })
      .notNull()
      .default("platform"),
    // 游戏反馈时携带的游戏 ID（平台反馈为空字符串）
    gameId: text("game_id").default(""),
    // 联系方式（可选，邮箱或 Discord 等）
    contact: text("contact").default(""),
    // 反馈内容
    content: text("content").notNull(),
    // 提交者 IP
    userIp: text("user_ip").notNull().default(""),
    // 提交者 User-Agent
    userAgent: text("user_agent").notNull().default(""),
    // 处理状态：pending 待处理 / resolved 已处理
    status: text("status", { enum: ["pending", "resolved"] })
      .notNull()
      .default("pending"),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    typeIdx: index("feedbacks_type_idx").on(t.type),
    statusIdx: index("feedbacks_status_idx").on(t.status),
    gameIdx: index("feedbacks_game_idx").on(t.gameId),
    createdIdx: index("feedbacks_created_idx").on(t.createdAt),
  }),
);

/** 游戏游玩日志表 */
export const gamePlayLogs = sqliteTable(
  "game_play_logs",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(genUuid),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    userIp: text("user_ip").notNull().default(""),
    userAgent: text("user_agent").notNull().default(""),
    playedAt: integer("played_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    gameIdx: index("play_logs_game_idx").on(t.gameId),
    playedAtIdx: index("play_logs_played_at_idx").on(t.playedAt),
  }),
);

export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;
export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;
export type GamePlayLog = typeof gamePlayLogs.$inferSelect;
export type GameLike = typeof gameLikes.$inferSelect;
export type GameDislike = typeof gameDislikes.$inferSelect;
export type Feedback = typeof feedbacks.$inferSelect;
export type AdminOperationLog = typeof adminOperationLogs.$inferSelect;

// ─── RBAC：角色 / 菜单 / 关联表 / 系统配置 ─────────────────────────

/** 系统角色表 */
export const sysRoles = sqliteTable(
  "sys_roles",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(genUuid),
    name: text("name").notNull(),
    code: text("code").notNull(),
    description: text("description").default(""),
    sortOrder: integer("sort_order").default(0),
    isActive: integer("is_active").default(1),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(nowSeconds),
    updatedAt: integer("updated_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    codeIdx: uniqueIndex("sys_roles_code_idx").on(t.code),
    nameIdx: uniqueIndex("sys_roles_name_idx").on(t.name),
  }),
);

/** 系统菜单表（自引用 parent_id 实现树形层级） */
export const sysMenus = sqliteTable(
  "sys_menus",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(genUuid),
    parentId: text("parent_id"),
    name: text("name").notNull(),
    path: text("path"),
    icon: text("icon"),
    sortOrder: integer("sort_order").default(0),
    isVisible: integer("is_visible").default(1),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(nowSeconds),
    updatedAt: integer("updated_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    parentIdx: index("sys_menus_parent_idx").on(t.parentId),
  }),
);

/** 管理员 ↔ 角色 关联表 */
export const sysUserRoles = sqliteTable(
  "sys_user_roles",
  {
    adminId: text("admin_id")
      .notNull()
      .references(() => admins.id, { onDelete: "cascade" }),
    roleId: text("role_id")
      .notNull()
      .references(() => sysRoles.id, { onDelete: "cascade" }),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.adminId, t.roleId] }),
  }),
);

/** 角色 ↔ 菜单 关联表 */
export const sysRoleMenus = sqliteTable(
  "sys_role_menus",
  {
    roleId: text("role_id")
      .notNull()
      .references(() => sysRoles.id, { onDelete: "cascade" }),
    menuId: text("menu_id")
      .notNull()
      .references(() => sysMenus.id, { onDelete: "cascade" }),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.roleId, t.menuId] }),
  }),
);

/** 系统配置表（key-value） */
export const settings = sqliteTable(
  "settings",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(genUuid),
    key: text("key").notNull(),
    value: text("value").default(""),
    remark: text("remark").default(""),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(nowSeconds),
    updatedAt: integer("updated_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    keyIdx: uniqueIndex("settings_key_idx").on(t.key),
  }),
);

export type SysRole = typeof sysRoles.$inferSelect;
export type NewSysRole = typeof sysRoles.$inferInsert;
export type SysMenu = typeof sysMenus.$inferSelect;
export type NewSysMenu = typeof sysMenus.$inferInsert;
export type SysUserRole = typeof sysUserRoles.$inferSelect;
export type SysRoleMenu = typeof sysRoleMenus.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;

// ─── 内容组织：分类 / 标签 / 专题 ───────────────────────────────

/** 分类表（网站骨架，固定不常改） */
export const categories = sqliteTable(
  "categories",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(genUuid),
    slug: text("slug").notNull(),
    name: text("name").notNull().default(""),
    locale: text("locale", { mode: "json" })
      .$type<TaxonomyLocale>()
      .default({
        en: { name: "", description: "", seoTitle: "", seoDescription: "" },
        zh: { name: "", description: "", seoTitle: "", seoDescription: "" },
      }),
    icon: text("icon").default(""),
    coverImage: text("cover_image").default(""),
    color: text("color").default(""),
    sortOrder: integer("sort_order").default(0),
    isVisible: integer("is_visible").default(1),
    gameCount: integer("game_count").default(0),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(nowSeconds),
    updatedAt: integer("updated_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    slugIdx: uniqueIndex("categories_slug_idx").on(t.slug),
    sortIdx: index("categories_sort_idx").on(t.sortOrder),
  }),
);

/** 标签表（内容属性，SEO/推荐） */
export const tags = sqliteTable(
  "tags",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(genUuid),
    slug: text("slug").notNull(),
    name: text("name").notNull().default(""),
    locale: text("locale", { mode: "json" })
      .$type<TaxonomyLocale>()
      .default({
        en: { name: "", description: "", seoTitle: "", seoDescription: "" },
        zh: { name: "", description: "", seoTitle: "", seoDescription: "" },
      }),
    icon: text("icon").default(""),
    color: text("color").default(""),
    sortOrder: integer("sort_order").default(0),
    isVisible: integer("is_visible").default(1),
    gameCount: integer("game_count").default(0),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(nowSeconds),
    updatedAt: integer("updated_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    slugIdx: uniqueIndex("tags_slug_idx").on(t.slug),
    sortIdx: index("tags_sort_idx").on(t.sortOrder),
  }),
);

/** 专题表（运营专题，后台配置） */
export const collections = sqliteTable(
  "collections",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(genUuid),
    slug: text("slug").notNull(),
    name: text("name").notNull().default(""),
    locale: text("locale", { mode: "json" })
      .$type<TaxonomyLocale>()
      .default({
        en: { name: "", description: "", seoTitle: "", seoDescription: "" },
        zh: { name: "", description: "", seoTitle: "", seoDescription: "" },
      }),
    icon: text("icon").default(""),
    coverImage: text("cover_image").default(""),
    layout: text("layout", {
      enum: ["grid", "list", "carousel", "hero"],
    }).default("grid"),
    sortOrder: integer("sort_order").default(0),
    isVisible: integer("is_visible").default(1),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(nowSeconds),
    updatedAt: integer("updated_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    slugIdx: uniqueIndex("collections_slug_idx").on(t.slug),
    sortIdx: index("collections_sort_idx").on(t.sortOrder),
  }),
);

/** 游戏 ↔ 标签 关联表（多对多） */
export const gameTags = sqliteTable(
  "game_tags",
  {
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.gameId, t.tagId] }),
    tagIdx: index("game_tags_tag_idx").on(t.tagId),
  }),
);

/** 游戏 ↔ 专题 关联表（多对多，sortOrder 控制专题内排序） */
export const gameCollections = sqliteTable(
  "game_collections",
  {
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").default(0),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.gameId, t.collectionId] }),
    collectionIdx: index("game_collections_collection_idx").on(t.collectionId),
  }),
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
export type GameTag = typeof gameTags.$inferSelect;
export type GameCollection = typeof gameCollections.$inferSelect;

// ─── C 端用户 / OAuth / 会话 ──────────────────────────────────

/**
 * C 端用户表（与 admins 表分离，避免 B 端账号和 C 端账号混淆）。
 * 第三方登录（Google 等）首次授权时自动创建。
 */
export const users = sqliteTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(genUuid),
    // 邮箱（来自 OAuth provider，nullable 向前兼容）
    email: text("email"),
    // 显示名（来自 OAuth provider，可由用户修改）
    name: text("name"),
    // 头像 URL（来自 OAuth provider，可由用户上传替换）
    avatar: text("avatar"),
    // 用户偏好语言（默认 en）
    locale: text("locale").default("en"),
    // 启用状态（0/1，B 端可禁用）
    isActive: integer("is_active").default(1),
    // 最近登录时间（Unix 秒）
    lastLoginAt: integer("last_login_at"),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(nowSeconds),
    updatedAt: integer("updated_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
  }),
);

/**
 * 第三方登录账号关联表。
 * 同一个 user 可关联多个 provider（未来支持 GitHub/Microsoft 等）。
 * 复合唯一索引 (provider, providerUserId) 防止同一第三方账号重复绑定。
 */
export const authAccounts = sqliteTable(
  "auth_accounts",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(genUuid),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // provider 标识：google / github / ...
    provider: text("provider").notNull(),
    // 第三方用户 ID（Google 的 sub）
    providerUserId: text("provider_user_id").notNull(),
    // 第三方返回的邮箱（可能与 users.email 不同步）
    providerEmail: text("provider_email"),
    // provider 返回的原始 metadata（JSON 字符串，应用层手动 parse）
    providerMeta: text("provider_meta").default("{}"),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(nowSeconds),
    updatedAt: integer("updated_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    providerUserIdx: uniqueIndex("auth_accounts_provider_user_idx").on(t.provider, t.providerUserId),
    userIdIdx: index("auth_accounts_user_id_idx").on(t.userId),
  }),
);

/**
 * C 端用户会话表（Refresh Token 持久化）。
 *
 * 设计要点：
 * - access token：JWT（短期 15min），存在客户端 cookie，不入库
 * - refresh token：随机 32 字节 hex（长期 30d），仅以 SHA-256 哈希存库，
 *   明文通过 httpOnly cookie 下发；轮换使用（一次一换）防重放
 * - revokedAt：软撤销标记，登出/被 B 端踢出时填入
 */
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(genUuid),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // refresh token 的 SHA-256 哈希（hex）
    refreshTokenHash: text("refresh_token_hash").notNull(),
    // 客户端 IP（用于审计/异常检测）
    ip: text("ip").notNull().default(""),
    // 客户端 User-Agent
    userAgent: text("user_agent").notNull().default(""),
    // 过期时间（Unix 秒）
    expiresAt: integer("expires_at").notNull(),
    // 撤销时间（nullable：未撤销）
    revokedAt: integer("revoked_at"),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(nowSeconds),
    updatedAt: integer("updated_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    userIdIdx: index("sessions_user_id_idx").on(t.userId),
    refreshIdx: index("sessions_refresh_hash_idx").on(t.refreshTokenHash),
    expiresIdx: index("sessions_expires_idx").on(t.expiresAt),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AuthAccount = typeof authAccounts.$inferSelect;
export type NewAuthAccount = typeof authAccounts.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

// ─── 积分系统 ───────────────────────────────────────────────

/**
 * C 端用户积分账户表。
 *
 * - 每个用户最多一个账户（userId 唯一）
 * - balance 可正可负（允许透支场景，业务侧自行约束）
 * - 调整积分请走 adjustPoints()，保证账户自动创建 + 日志写入
 */
export const pointAccounts = sqliteTable(
  "point_accounts",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(genUuid),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // 当前余额（可为负，业务侧约束）
    balance: integer("balance").notNull().default(0),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(nowSeconds),
    updatedAt: integer("updated_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    userIdIdx: uniqueIndex("point_accounts_user_id_idx").on(t.userId),
  }),
);

/**
 * 积分变动日志表。每次 balance 变化都写一条。
 *
 * - type: earn（获得）/ spend（消耗）/ adjust（B 端手动调整）/ revoke（回滚）
 * - bizType: 业务类型（login / daily_signin / mission / game_play / admin_adjust 等）
 * - bizId: 业务实体 ID（如 missionId、gameId），用于幂等去重和回查
 */
export const pointLogs = sqliteTable(
  "point_logs",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(genUuid),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // 变动值（正数获得，负数消耗）
    change: integer("change").notNull(),
    // 变动后余额（便于审计/对账）
    balanceAfter: integer("balance_after").notNull(),
    // 变动类型
    type: text("type").notNull(),
    // 业务类型（nullable：B 端手动调整时可空）
    bizType: text("biz_type"),
    // 业务实体 ID
    bizId: text("biz_id"),
    // 备注（nullable）
    remark: text("remark"),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    userIdIdx: index("point_logs_user_id_idx").on(t.userId),
    // 业务幂等查询：按 (bizType, bizId) 查是否已发放
    bizIdx: index("point_logs_biz_idx").on(t.bizType, t.bizId),
    createdAtIdx: index("point_logs_created_at_idx").on(t.createdAt),
  }),
);

export type PointAccount = typeof pointAccounts.$inferSelect;
export type NewPointAccount = typeof pointAccounts.$inferInsert;
export type PointLog = typeof pointLogs.$inferSelect;
export type NewPointLog = typeof pointLogs.$inferInsert;

// ─── 任务系统 ───────────────────────────────────────────────

/**
 * 任务定义表。
 *
 * - type: daily（每日重置）/ weekly（每周重置）/ achievement（成就，一次性）
 * - event: 触发事件名（LOGIN / GAME_FINISH 等，nullable 表示只能手动触发）
 * - target: 完成所需的进度阈值
 * - rewardType: 奖励类型（目前仅 "point"）
 * - rewardValue: 奖励数值（积分数量）
 * - enabled: 0/1 启用状态
 * - startAt/endAt: 有效期（nullable 表示不限）
 */
export const missions = sqliteTable(
  "missions",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(genUuid),
    name: text("name").notNull(),
    description: text("description").default(""),
    type: text("type", {
      enum: ["daily", "weekly", "achievement"],
    }).notNull(),
    event: text("event"),
    target: integer("target").notNull().default(1),
    rewardType: text("reward_type").notNull().default("point"),
    rewardValue: integer("reward_value").notNull().default(0),
    icon: text("icon"),
    sortOrder: integer("sort_order").default(0),
    enabled: integer("enabled").default(1),
    startAt: integer("start_at"),
    endAt: integer("end_at"),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(nowSeconds),
    updatedAt: integer("updated_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    typeIdx: index("missions_type_idx").on(t.type),
    eventIdx: index("missions_event_idx").on(t.event),
    enabledIdx: index("missions_enabled_idx").on(t.enabled),
    sortIdx: index("missions_sort_idx").on(t.sortOrder),
  }),
);

/**
 * 用户任务进度表（懒创建 + 周期键）。
 *
 * - cycleKey: 周期标识。daily="YYYY-MM-DD"，weekly="YYYY-Www"，achievement="once"
 *   同一周期内 (userId, missionId, cycleKey) 唯一，跨周期可重复
 * - progress: 当前进度
 * - status: pending（进行中）/ completed（已完成待领取）/ claimed（已领取）
 * - claimedAt: 领取奖励时间（nullable）
 *
 * 设计：首次触发事件时 INSERT OR IGNORE 创建记录，后续 UPDATE progress。
 */
export const userMissions = sqliteTable(
  "user_missions",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(genUuid),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    missionId: text("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    cycleKey: text("cycle_key").notNull().default(""),
    progress: integer("progress").notNull().default(0),
    status: text("status", {
      enum: ["pending", "completed", "claimed"],
    }).notNull().default("pending"),
    claimedAt: integer("claimed_at"),
    updatedAt: integer("updated_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    userMissionCycleIdx: uniqueIndex("user_missions_user_mission_cycle_idx").on(
      t.userId,
      t.missionId,
      t.cycleKey,
    ),
    userIdx: index("user_missions_user_id_idx").on(t.userId),
    missionIdx: index("user_missions_mission_id_idx").on(t.missionId),
    statusIdx: index("user_missions_status_idx").on(t.status),
    updatedAtIdx: index("user_missions_updated_at_idx").on(t.updatedAt),
  }),
);

export type Mission = typeof missions.$inferSelect;
export type NewMission = typeof missions.$inferInsert;
export type UserMission = typeof userMissions.$inferSelect;
export type NewUserMission = typeof userMissions.$inferInsert;

// ─── 背包系统 ───────────────────────────────────────────────

/**
 * 物品模板表。
 *
 * - code: 物品英文唯一编码（业务侧引用，如 "coin_pack"）
 * - type: 物品类型（英文，如 "consumable" / "material" / "gift"）
 * - name/description: 多语言，以 JSON 字符串存储 { en, zh }
 * - icon: 物品图标 URL（上传到 OSS 单独目录 images/items）
 * - rarity: 稀有度（英文，如 "common" / "rare" / "epic" / "legendary"）
 * - stackable: 0/1 是否可堆叠
 * - maxStack: 最大堆叠数（stackable=1 时生效；0 表示不限）
 * - enabled: 0/1 启用状态
 * - sortOrder: 排序权重
 */
export const itemTemplates = sqliteTable(
  "item_templates",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(genUuid),
    code: text("code").notNull(),
    type: text("type").notNull().default("consumable"),
    name: text("name").notNull(),
    description: text("description").default(""),
    icon: text("icon"),
    rarity: text("rarity").default("common"),
    stackable: integer("stackable").default(0),
    maxStack: integer("max_stack").default(0),
    enabled: integer("enabled").default(1),
    sortOrder: integer("sort_order").default(0),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(nowSeconds),
    updatedAt: integer("updated_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    codeIdx: uniqueIndex("item_templates_code_idx").on(t.code),
    typeIdx: index("item_templates_type_idx").on(t.type),
    enabledIdx: index("item_templates_enabled_idx").on(t.enabled),
    sortIdx: index("item_templates_sort_idx").on(t.sortOrder),
  }),
);

/**
 * 用户背包表。
 *
 * - 同一用户同一物品最多一行（userId + itemId 唯一）
 * - quantity: 当前数量（>=0）
 * - 通过 grantItem() 调整数量并写入 inventory_logs
 */
export const userInventory = sqliteTable(
  "user_inventory",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(genUuid),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: text("item_id")
      .notNull()
      .references(() => itemTemplates.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(0),
    updatedAt: integer("updated_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    userItemIdx: uniqueIndex("user_inventory_user_item_idx").on(t.userId, t.itemId),
    userIdx: index("user_inventory_user_id_idx").on(t.userId),
    itemIdIdx: index("user_inventory_item_id_idx").on(t.itemId),
  }),
);

/**
 * 背包变动日志表。每次 quantity 变化都写一条。
 *
 * - change: 变动值（正数获得，负数消耗）
 * - balanceAfter: 变动后数量
 * - reason: 业务原因描述（英文，便于跨语言展示）
 * - bizType: 业务类型（如 mission / admin_grant / shop_purchase 等）
 * - bizId: 业务实体 ID（用于幂等去重）
 */
export const inventoryLogs = sqliteTable(
  "inventory_logs",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(genUuid),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: text("item_id")
      .notNull()
      .references(() => itemTemplates.id, { onDelete: "cascade" }),
    change: integer("change").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    reason: text("reason"),
    bizType: text("biz_type"),
    bizId: text("biz_id"),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    userIdIdx: index("inventory_logs_user_id_idx").on(t.userId),
    itemIdIdx: index("inventory_logs_item_id_idx").on(t.itemId),
    bizIdx: index("inventory_logs_biz_idx").on(t.bizType, t.bizId),
    createdAtIdx: index("inventory_logs_created_at_idx").on(t.createdAt),
  }),
);

export type ItemTemplate = typeof itemTemplates.$inferSelect;
export type NewItemTemplate = typeof itemTemplates.$inferInsert;
export type UserInventory = typeof userInventory.$inferSelect;
export type NewUserInventory = typeof userInventory.$inferInsert;
export type InventoryLog = typeof inventoryLogs.$inferSelect;
export type NewInventoryLog = typeof inventoryLogs.$inferInsert;

// ─── 宠物系统 ───────────────────────────────────────────────

/**
 * 宠物表（animals）。
 *
 * - ownerId: 持有者（C 端用户），一人可有多只
 * - speciesId: 物种标识（字符串，如 "moss_pet"），不做外键约束
 * - genome: 基因 JSON 字符串（plain text 存储，应用层 parse，参考 badge/faq）
 * - generation: 代数（1=初代，由兑换/发放产生；>1=繁殖产生）
 * - fatherId/motherId: 父母宠物 ID（自引用，nullable：初代无父母）
 * - breedCount: 繁殖次数
 * - cooldownAt: 下次可繁殖时间（nullable）
 * - status: active(正常)/resting(休息中)
 *
 * 基因结构见 PetGenome 类型。当前不渲染画面，仅展示基因卡片。
 */
export const animals = sqliteTable(
  "animals",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(genUuid),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    speciesId: text("species_id").notNull(),
    // 基因 JSON 字符串（plain text，应用层手动 parse）
    genome: text("genome").notNull(),
    generation: integer("generation").notNull().default(1),
    // 自引用：父母宠物 ID。Drizzle 不支持自引用外键约束在 D1，应用层保证。
    fatherId: text("father_id"),
    motherId: text("mother_id"),
    breedCount: integer("breed_count").notNull().default(0),
    // 下次可繁殖时间（Unix 秒，nullable：可立即繁殖）
    cooldownAt: integer("cooldown_at"),
    status: text("status", {
      enum: ["active", "resting"],
    }).notNull().default("active"),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(nowSeconds),
    updatedAt: integer("updated_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    ownerIdx: index("animals_owner_id_idx").on(t.ownerId),
    speciesIdx: index("animals_species_id_idx").on(t.speciesId),
    generationIdx: index("animals_generation_idx").on(t.generation),
    statusIdx: index("animals_status_idx").on(t.status),
  }),
);

export type Animal = typeof animals.$inferSelect;
export type NewAnimal = typeof animals.$inferInsert;

// Zod Schemas（前后端共享校验）
export const insertGameSchema = createInsertSchema(games);
export const selectGameSchema = createSelectSchema(games);

// 业务类型导出（与 src/types 对齐）
export type { GameLocale, GameStatus, TaxonomyLocale, CollectionLayout } from "@/types";
