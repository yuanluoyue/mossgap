import { z } from "zod";

/**
 * 环境变量 schema（懒校验，避免在 build 时因缺少密钥而失败）。
 *
 * 读取优先级：
 * 1. Cloudflare Workers 运行时：通过 getCloudflareContext().env 读取（S3_*、JWT_SECRET 等）
 * 2. Node.js 运行时：通过 process.env 读取（本地开发、seed 脚本）
 *
 * 注意：数据库（D1）通过 wrangler.jsonc 的 binding 注入，不在此处配置。
 */
const serverEnvSchema = z.object({
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default("auto"),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_KEY_PREFIX: z.string().optional().default(""),
  S3_PUBLIC_URL: z.string().url(),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET 至少 16 个字符"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  // ─── C 端 Google OAuth ───
  // 未配置时 /api/auth/google 会返回 503，登录按钮会显示但点击会提示未配置
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // 可选：覆盖默认回调 URL；不填时由 NEXT_PUBLIC_APP_URL + /api/auth/google/callback 推导
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * 合并 process.env 和 Cloudflare env，确保能从两个来源读取。
 * Cloudflare env 优先（包含 bindings 和 vars），process.env 作为回退。
 *
 * 结果在模块级别缓存：同一 Worker 实例的多次请求共享，避免重复调用 getCloudflareContext
 * （该调用涉及 async context 切换，在 Cloudflare Workers 上有 CPU 开销）。
 */
let _rawEnvCache: Record<string, string | undefined> | null = null;

export async function getRawEnv(): Promise<Record<string, string | undefined>> {
  if (_rawEnvCache) return _rawEnvCache;
  const fromProcess = process.env as Record<string, string | undefined>;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    const fromCtx = ctx.env as unknown as Record<string, string | undefined>;
    _rawEnvCache = { ...fromProcess, ...fromCtx };
  } catch {
    _rawEnvCache = fromProcess;
  }
  return _rawEnvCache;
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

/**
 * 是否已配置服务端必需环境变量。
 * 失败时打印具体错误到 console.error，方便在 Cloudflare 日志中排查。
 */
export async function hasServerEnv(): Promise<boolean> {
  try {
    const raw = await getRawEnv();
    const parsed = serverEnvSchema.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      console.error("[env] 环境变量校验失败:", issues);
      console.error("[env] 可用变量:", Object.keys(raw).filter((k) => !k.startsWith("DB") && k !== "ASSETS" && k !== "IMAGES" && k !== "WORKER_SELF_REFERENCE").join(", "));
    }
    return parsed.success;
  } catch (e) {
    console.error("[env] getRawEnv 失败:", e);
    return false;
  }
}
