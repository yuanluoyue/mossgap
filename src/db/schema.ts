import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type { GameLocale } from "@/types";

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
    category: text("category", {
      enum: [
        "action",
        "puzzle",
        "arcade",
        "adventure",
        "strategy",
        "sports",
        "racing",
        "other",
      ],
    })
      .notNull()
      .default("other"),
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
    playCount: integer("play_count").notNull().default(0),
    locale: text("locale", { mode: "json" })
      .$type<GameLocale>()
      .notNull()
      .default({ en: { title: "", description: "" }, zh: { title: "", description: "" } }),
    // 新增字段（均 nullable 以保持向前兼容，应用层兜底默认值）
    sourceType: text("source_type", { enum: ["zip", "iframe"] }).default("zip"),
    iframeUrl: text("iframe_url").default(""),
    howToPlay: text("how_to_play", { mode: "json" })
      .$type<{ en: string; zh: string }>()
      .default({ en: "", zh: "" }),
    relatedGameIds: text("related_game_ids", { mode: "json" })
      .$type<string[]>()
      .default([]),
    ossSize: integer("oss_size").default(0),
    likeCount: integer("like_count").default(0),
    dislikeCount: integer("dislike_count").default(0),
    // 是否首页推荐（0/1），nullable 向前兼容
    featured: integer("featured").default(0),
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
    categoryIdx: index("games_category_idx").on(t.category),
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
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(nowSeconds),
  },
  (t) => ({
    actionIdx: index("op_logs_action_idx").on(t.action),
    targetIdx: index("op_logs_target_idx").on(t.targetType, t.targetId),
    createdIdx: index("op_logs_created_idx").on(t.createdAt),
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

// Zod Schemas（前后端共享校验）
export const insertGameSchema = createInsertSchema(games);
export const selectGameSchema = createSelectSchema(games);

// 业务类型导出（与 src/types 对齐）
export type { GameCategory, GameLocale, GameStatus } from "@/types";
