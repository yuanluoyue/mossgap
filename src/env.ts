import { z } from "zod";

/**
 * 环境变量 schema（懒校验，避免在 build 时因缺少密钥而失败）。
 * 服务端密钥通过 getServerEnv() 读取；C 端公开变量通过 env.NEXT_PUBLIC_* 读取。
 *
 * 注意：数据库（D1）通过 wrangler.jsonc 的 binding 注入，不在此处配置。
 * 管理员账号存储在数据库 admins 表中，通过 seed 脚本初始化。
 */
const serverEnvSchema = z.object({
  // ===== S3 兼容对象存储（生产：Cloudflare R2；本地：MinIO） =====
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default("auto"),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  // 对象公共访问域名（用于拼接游戏 iframe URL）
  S3_PUBLIC_URL: z.string().url(),
  // MinIO 需要 path-style，R2 不需要（默认 false）
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  // 兼容旧的 R2_* 变量名（若设置则覆盖 S3_*，便于复用现有部署配置）
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  // ===== Admin 认证 =====
  // JWT 签名密钥（admin 账号本身存数据库，此密钥仅用于签发 JWT）
  JWT_SECRET: z.string().min(16, "JWT_SECRET 至少 16 个字符"),

  // ===== 应用 =====
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

/** 读取并校验服务端环境变量（仅在使用时调用）。 */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`环境变量校验失败: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** 是否已配置服务端必需环境变量（用于在 UI 中判断功能可用性）。 */
export function hasServerEnv(): boolean {
  return serverEnvSchema.safeParse(process.env).success;
}
