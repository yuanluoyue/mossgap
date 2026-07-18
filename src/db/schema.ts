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

// Zod Schemas（前后端共享校验）
export const insertGameSchema = createInsertSchema(games);
export const selectGameSchema = createSelectSchema(games);

// 业务类型导出（与 src/types 对齐）
export type { GameLocale, GameStatus, TaxonomyLocale, CollectionLayout } from "@/types";
