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
    screenshots: text("screenshots")
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
    locale: text("locale")
      .$type<GameLocale>()
      .notNull()
      .default({ en: { title: "", description: "" }, zh: { title: "", description: "" } }),
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

// Zod Schemas（前后端共享校验）
export const insertGameSchema = createInsertSchema(games);
export const selectGameSchema = createSelectSchema(games);

// 业务类型导出（与 src/types 对齐）
export type { GameCategory, GameLocale, GameStatus } from "@/types";
