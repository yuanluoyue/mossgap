import { z } from "zod";

/**
 * 环境变量 schema（懒校验，避免在 build 时因缺少密钥而失败）。
 *
 * 读取优先级：
 * 1. Cloudflare Workers 运行时：通过 getCloudflareContext().env 读取（S3_*、JWT_SECRET 等）
 * 2. Node.js 运行时：通过 process.env 读取（本地开发、seed 脚本）
 *
 * NEXT_PUBLIC_* 在构建时由 Next.js 注入，可直接用 process.env.NEXT_PUBLIC_* 读取。
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

  // ===== Admin 认证 =====
  // JWT 签名密钥（admin 账号本身存数据库，此密钥仅用于签发 JWT）
  JWT_SECRET: z.string().min(16, "JWT_SECRET 至少 16 个字符"),

  // ===== 应用 =====
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * 在 Cloudflare Workers 运行时从 getCloudflareContext 获取 env，
 * 在 Node.js 环境回退到 process.env。
 */
async function getRawEnv(): Promise<Record<string, string | undefined>> {
  // Cloudflare Workers 运行时（生产 + 本地 dev with OpenNext）
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    return ctx.env as unknown as Record<string, string | undefined>;
  } catch {
    // Node.js 环境（seed 脚本等）
    return process.env as Record<string, string | undefined>;
  }
}

let cached: ServerEnv | null = null;

/** 读取并校验服务端环境变量（仅在使用时调用）。 */
export async function getServerEnv(): Promise<ServerEnv> {
  if (cached) return cached;
  const raw = await getRawEnv();
  const parsed = serverEnvSchema.safeParse(raw);
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
export async function hasServerEnv(): Promise<boolean> {
  try {
    const raw = await getRawEnv();
    return serverEnvSchema.safeParse(raw).success;
  } catch {
    return false;
  }
}
