import { z } from "zod";
import { GAME_CATEGORIES, GAME_STATUSES } from "@/types";

const localeBlockSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(120),
  description: z.string().max(2000).default(""),
});

/** 创建/更新游戏校验。 */
export const upsertGameSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "slug 只能包含小写字母、数字和连字符"),
  category: z.enum(GAME_CATEGORIES as [string, ...string[]]),
  coverImage: z.string().default(""),
  screenshots: z.array(z.string()).default([]),
  entryFile: z.string().min(1, "入口文件不能为空").default("index.html"),
  status: z.enum(GAME_STATUSES as [string, ...string[]]),
  locale: z.object({
    en: localeBlockSchema,
    zh: localeBlockSchema,
  }),
});

export type UpsertGameInput = z.infer<typeof upsertGameSchema>;

/** 登录校验。 */
export const loginSchema = z.object({
  username: z.string().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Admin 游戏列表查询参数。 */
export const listGamesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(GAME_STATUSES as [string, ...string[]]).optional(),
});

/** C 端游戏列表查询参数。 */
export const publicListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(24),
  category: z.enum(GAME_CATEGORIES as [string, ...string[]]).optional(),
  sort: z.enum(["popular", "newest"]).default("newest"),
  q: z.string().optional(),
});
