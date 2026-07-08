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

// ─── RBAC：菜单 / 角色 / 用户 / 配置 / 个人中心 ───────────────────────

/** 菜单创建校验。 */
export const sysMenuCreateSchema = z.object({
  name: z.string().min(1, "菜单名称不能为空").max(64, "菜单名称过长"),
  path: z.string().max(255).optional().nullable().default(null),
  parentId: z.string().max(64).optional().nullable().default(null),
  icon: z.string().max(64).optional().nullable().default(null),
  sortOrder: z.number().int().min(0).max(9999).optional().default(0),
  isVisible: z.boolean().optional().default(true),
});

/** 菜单更新校验（全字段可选）。 */
export const sysMenuUpdateSchema = z.object({
  name: z.string().min(1, "菜单名称不能为空").max(64).optional(),
  path: z.string().max(255).nullable().optional(),
  parentId: z.string().max(64).nullable().optional(),
  icon: z.string().max(64).nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isVisible: z.boolean().optional(),
});

export type SysMenuCreateInput = z.infer<typeof sysMenuCreateSchema>;
export type SysMenuUpdateInput = z.infer<typeof sysMenuUpdateSchema>;

/** 角色创建校验。 */
export const sysRoleCreateSchema = z.object({
  name: z.string().min(1, "角色名称不能为空").max(64),
  code: z
    .string()
    .min(1, "角色编码不能为空")
    .max(64)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "角色编码只能包含字母、数字和下划线，且以字母开头"),
  description: z.string().max(500).default(""),
  sortOrder: z.number().int().min(0).max(9999).optional().default(0),
  isActive: z.boolean().optional().default(true),
  menuIds: z.array(z.string()).default([]),
});

/** 角色更新校验（全字段可选）。 */
export const sysRoleUpdateSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  code: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "角色编码格式不合法")
    .optional(),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
  menuIds: z.array(z.string()).optional(),
});

export type SysRoleCreateInput = z.infer<typeof sysRoleCreateSchema>;
export type SysRoleUpdateInput = z.infer<typeof sysRoleUpdateSchema>;

/** 管理员创建校验。 */
export const adminUserCreateSchema = z.object({
  username: z
    .string()
    .min(2, "用户名至少 2 个字符")
    .max(64, "用户名过长")
    .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线"),
  password: z.string().min(6, "密码至少 6 位").max(128, "密码过长"),
  email: z.string().email("邮箱格式不合法").max(255).optional().nullable().default(null),
  name: z.string().max(64).optional().nullable().default(null),
  isActive: z.boolean().optional().default(true),
  roleId: z.string().min(1, "必须指定角色"),
});

/** 管理员更新校验（全字段可选，password 为空表示不改密码）。 */
export const adminUserUpdateSchema = z.object({
  username: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  password: z.string().max(128).optional(),
  email: z.string().email().max(255).nullable().optional(),
  name: z.string().max(64).nullable().optional(),
  isActive: z.boolean().optional(),
  roleId: z.string().min(1).optional(),
});

export type AdminUserCreateInput = z.infer<typeof adminUserCreateSchema>;
export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>;

/** 系统配置创建校验。 */
export const settingCreateSchema = z.object({
  key: z
    .string()
    .min(1, "键不能为空")
    .max(128, "键过长")
    .regex(/^[a-zA-Z][a-zA-Z0-9_.\-]*$/, "键只能包含字母、数字、点、下划线和连字符"),
  value: z.string().max(10000).default(""),
  remark: z.string().max(500).default(""),
});

/** 系统配置更新校验。 */
export const settingUpdateSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-zA-Z][a-zA-Z0-9_.\-]*$/)
    .optional(),
  value: z.string().max(10000).optional(),
  remark: z.string().max(500).optional(),
});

export type SettingCreateInput = z.infer<typeof settingCreateSchema>;
export type SettingUpdateInput = z.infer<typeof settingUpdateSchema>;

/** 个人信息更新校验。 */
export const profileUpdateSchema = z.object({
  name: z.string().max(64, "昵称过长").optional().nullable(),
  email: z.string().email("邮箱格式不合法").max(255).optional().nullable(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/** 修改密码校验。 */
export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "请输入原密码"),
    newPassword: z.string().min(6, "新密码至少 6 位").max(128, "新密码过长"),
    confirmPassword: z.string().min(1, "请再次输入新密码"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "两次输入的新密码不一致",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/** 操作日志列表查询参数。 */
export const listAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  resource: z.string().optional(),
  action: z.string().optional(),
  user: z.string().optional(),
});

/** 管理员列表查询参数。 */
export const listAdminsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
});
