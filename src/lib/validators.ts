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
  sourceType: z.enum(["zip", "iframe"]).default("zip"),
  iframeUrl: z.string().default(""),
  howToPlay: z
    .object({
      en: z.string().max(5000).default(""),
      zh: z.string().max(5000).default(""),
    })
    .default({ en: "", zh: "" }),
  relatedGameIds: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
});

export type UpsertGameInput = z.infer<typeof upsertGameSchema>;

/** 创建 iframe 游戏校验（无 zip 上传）。 */
export const createIframeGameSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "slug 只能包含小写字母、数字和连字符"),
  iframeUrl: z
    .string()
    .trim()
    .min(1, "iframe URL 不能为空")
    .refine(
      (v) => {
        try {
          const u = new URL(v);
          return u.protocol === "http:" || u.protocol === "https:";
        } catch {
          return false;
        }
      },
      "请输入合法的 http/https iframe URL",
    ),
  title: z.string().min(1).max(120),
  category: z.enum(GAME_CATEGORIES as [string, ...string[]]).default("other"),
  coverImage: z.string().default(""),
});

export type CreateIframeGameInput = z.infer<typeof createIframeGameSchema>;

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

/** 状态切换校验（上下架快捷操作，仅需 status 字段）。 */
export const updateGameStatusSchema = z.object({
  status: z.enum(GAME_STATUSES as [string, ...string[]]),
});

export type UpdateGameStatusInput = z.infer<typeof updateGameStatusSchema>;

/** C 端游戏列表查询参数。 */
export const publicListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(24),
  category: z.enum(GAME_CATEGORIES as [string, ...string[]]).optional(),
  sort: z.enum(["popular", "newest"]).default("newest"),
  q: z.string().optional(),
});

/** 用户反馈提交校验。 */
export const createFeedbackSchema = z.object({
  type: z.enum(["game", "platform"]).default("platform"),
  gameId: z.string().default(""),
  contact: z.string().max(200).default(""),
  content: z.string().min(1, "反馈内容不能为空").max(2000, "反馈内容过长"),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;

/** 后台反馈列表查询参数。 */
export const listFeedbacksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  type: z.enum(["game", "platform"]).optional(),
  status: z.enum(["pending", "resolved"]).optional(),
  search: z.string().optional(),
});

/** 后台反馈状态更新校验。 */
export const updateFeedbackStatusSchema = z.object({
  status: z.enum(["pending", "resolved"]),
});
