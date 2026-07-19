import { getServerEnv } from "@/env";
import type { OssAdapter } from "./oss-adapter";
import { aws4FetchAdapter } from "./oss-adapter-aws4fetch";

/**
 * S3 兼容对象存储客户端。
 *
 * 使用 aws4fetch（基于 fetch + Web Crypto 的 AWS Signature V4 实现），
 * 不依赖 Node.js fs，可在 Cloudflare Workers 上安全运行。
 *
 * 所有对外暴露的 key 均为逻辑 key（不含 S3_KEY_PREFIX），
 * 适配器接收的是完整 key（已拼接前缀）。
 */

async function env() {
  return await getServerEnv();
}

// ===== 适配器 =====

function getAdapter(): OssAdapter {
  return aws4FetchAdapter;
}

// ===== Key 前缀工具 =====

function joinKey(prefix: string, relative: string): string {
  const p = prefix.replace(/^\/+|\/+$/g, "");
  const r = relative.replace(/^\/+/, "");
  return p ? `${p}/${r}` : r;
}

/** 将 S3_KEY_PREFIX 与逻辑 key 拼接为实际存储 key。 */
function fullKey(keyPrefix: string, key: string): string {
  return joinKey(keyPrefix, key);
}

/** 从实际存储 key 中去除 S3_KEY_PREFIX，还原为逻辑 key。 */
function stripKeyPrefix(keyPrefix: string, key: string): string {
  const p = keyPrefix.replace(/^\/+|\/+$/g, "");
  if (p && key.startsWith(`${p}/`)) {
    return key.slice(p.length + 1);
  }
  return key;
}

// ===== 公共 API =====

/** 对象公共访问域名（去尾斜杠）。 */
export async function r2PublicUrl(): Promise<string> {
  const e = await env();
  return e.S3_PUBLIC_URL.replace(/\/$/, "");
}

/** 拼接某对象在公共域名下的完整 URL。 */
export async function publicObjectUrl(ossPrefix: string, relativePath: string): Promise<string> {
  const e = await env();
  const key = fullKey(e.S3_KEY_PREFIX, joinKey(ossPrefix, relativePath));
  return `${await r2PublicUrl()}/${key}`;
}

/** 上传单个文件到对象存储。 */
export async function putObject(
  key: string,
  body: Uint8Array | string,
  contentType: string,
): Promise<void> {
  const e = await env();
  const adapter = getAdapter();
  await adapter.putObject(fullKey(e.S3_KEY_PREFIX, key), body, contentType);
}

/** 每批最大文件数（Cloudflare Workers 免费版 50 subrequest 限制，留余量给 DB 查询） */
const OSS_BATCH_SIZE = 40;

/** Cloudflare service binding Fetcher 类型 */
type ServiceBinding = {
  fetch: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
};

/**
 * 获取 WORKER_SELF_REFERENCE service binding。
 *
 * service binding 的 fetch 不计入当前 invocation 的 subrequest 限制，
 * 每个内部调用是独立的 Worker invocation，有自己的 50 subrequest 预算。
 *
 * 本地开发（wrangler dev / OpenNext）可能不会正确暴露这个 binding，
 * 此时返回 null，调用方回退到直接执行（本地无 subrequest 限制）。
 */
async function getServiceBinding(): Promise<ServiceBinding | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    const binding = (
      ctx.env as unknown as Record<string, unknown>
    ).WORKER_SELF_REFERENCE;
    // 严格校验是 Fetcher 对象（有 fetch 函数），避免误把字符串/其他类型当成 binding
    if (
      binding &&
      typeof binding === "object" &&
      typeof (binding as { fetch?: unknown }).fetch === "function"
    ) {
      return binding as ServiceBinding;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 直接并发上传（不做分批），供 upload-internal 内部 route 调用。
 * 外部请使用 putObjects，它会自动分批。
 */
export async function putObjectsDirect(
  prefix: string,
  files: { path: string; data: Uint8Array }[],
): Promise<void> {
  await Promise.all(
    files.map((f) =>
      putObject(joinKey(prefix, f.path), f.data, guessContentType(f.path)),
    ),
  );
}

/**
 * 批量上传多个文件，统一分批。
 *
 * 生产环境（有 WORKER_SELF_REFERENCE binding）：每批通过 service binding fetch
 * 触发新 Worker invocation，每批有独立的 50 subrequest 预算。
 *
 * 本地开发（无 binding）：直接并发上传，无 subrequest 限制。
 */
export async function putObjects(
  prefix: string,
  files: { path: string; data: Uint8Array }[],
): Promise<void> {
  const worker = await getServiceBinding();
  if (!worker) {
    await putObjectsDirect(prefix, files);
    return;
  }

  const e = await env();
  for (let i = 0; i < files.length; i += OSS_BATCH_SIZE) {
    const batch = files.slice(i, i + OSS_BATCH_SIZE);
    const formData = new FormData();
    formData.append("prefix", prefix);
    for (const f of batch) {
      formData.append(f.path, new Blob([f.data as BlobPart]));
    }

    // URL 用 0.0.0.0：service binding 路由只看 path，host 无所谓；
    // 如果 binding 没生效会立即连接失败，而不是 DNS 超时
    const response = await worker.fetch("http://0.0.0.0/api/admin/upload-internal", {
      method: "POST",
      body: formData,
      headers: { "x-internal-key": e.JWT_SECRET },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throw new Error(`批次上传失败 (${i}-${i + batch.length}): ${text}`);
    }
  }
}

/** 删除单个对象。 */
export async function deleteObject(key: string): Promise<void> {
  const e = await env();
  const adapter = getAdapter();
  await adapter.deleteObject(fullKey(e.S3_KEY_PREFIX, key));
}

/**
 * 删除某前缀下所有对象（递归清理），统一分批。
 * 分批逻辑同 putObjects。
 */
export async function deletePrefix(prefix: string): Promise<void> {
  const e = await env();
  const adapter = getAdapter();
  const fullPrefix = fullKey(e.S3_KEY_PREFIX, prefix).replace(/^\/+|\/+$/g, "");
  const objects = await adapter.listObjects(fullPrefix);
  if (objects.length === 0) return;

  const keys = objects.map((o) => o.key);

  const worker = await getServiceBinding();
  if (!worker) {
    // 本地开发：直接删除
    await adapter.deleteObjects(keys);
    return;
  }

  for (let i = 0; i < keys.length; i += OSS_BATCH_SIZE) {
    const batch = keys.slice(i, i + OSS_BATCH_SIZE);
    const response = await worker.fetch("http://0.0.0.0/api/admin/delete-internal", {
      method: "POST",
      body: JSON.stringify({ keys: batch }),
      headers: {
        "Content-Type": "application/json",
        "x-internal-key": e.JWT_SECRET,
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throw new Error(`批次删除失败 (${i}-${i + batch.length}): ${text}`);
    }
  }
}

/** 列出某前缀下所有对象，返回逻辑 key 与 size 列表。 */
export async function listPrefixObjects(
  prefix: string,
): Promise<{ key: string; size: number }[]> {
  const e = await env();
  const adapter = getAdapter();
  const fullPrefix = fullKey(e.S3_KEY_PREFIX, prefix).replace(/^\/+|\/+$/g, "");
  const objects = await adapter.listObjects(fullPrefix);
  // 去除存储前缀，返回逻辑 key
  return objects.map((o) => ({
    key: stripKeyPrefix(e.S3_KEY_PREFIX, o.key),
    size: o.size,
  }));
}

/** 统计某前缀下所有对象总占用字节数。 */
export async function getPrefixSize(prefix: string): Promise<number> {
  const items = await listPrefixObjects(prefix);
  return items.reduce((sum, o) => sum + o.size, 0);
}

/** 统计整个 bucket 的总占用字节数。 */
export async function getBucketSize(): Promise<number> {
  return getPrefixSize("");
}

// ===== Content-Type 推断 =====

export function guessContentType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    html: "text/html; charset=utf-8",
    htm: "text/html; charset=utf-8",
    js: "application/javascript; charset=utf-8",
    mjs: "application/javascript; charset=utf-8",
    css: "text/css; charset=utf-8",
    json: "application/json; charset=utf-8",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    otf: "font/otf",
    mp3: "audio/mpeg",
    ogg: "audio/ogg",
    wav: "audio/wav",
    mp4: "video/mp4",
    webm: "video/webm",
    wasm: "application/wasm",
    xml: "application/xml",
    txt: "text/plain; charset=utf-8",
  };
  return map[ext] ?? "application/octet-stream";
}

// ===== 图片资源 =====

const IMAGE_PREFIXES = {
  cover: "images/covers",
  screenshot: "images/screenshots",
  avatar: "images/avatars",
  editor: "images/editor",
  item: "images/items",
} as const;

export type ImageCategory = keyof typeof IMAGE_PREFIXES;

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg"] as const;

export function imageKey(category: ImageCategory, ext: string): string {
  const safeExt = ext.toLowerCase().replace(/^\.+/, "");
  const prefix = IMAGE_PREFIXES[category];
  // 使用全局 crypto.randomUUID()（Web Crypto API，edge/node 均可用）
  return `${prefix}/${crypto.randomUUID()}.${safeExt}`;
}

export function isAllowedImageExt(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return (IMAGE_EXTENSIONS as readonly string[]).includes(ext);
}

export async function extractKeyFromUrl(url: string): Promise<string | null> {
  if (!url) return null;
  const e = await env();
  const base = await r2PublicUrl();
  if (!url.startsWith(base)) return null;
  const rawKey = decodeURIComponent(url.slice(base.length + 1));
  return stripKeyPrefix(e.S3_KEY_PREFIX, rawKey);
}

export async function putImage(
  category: ImageCategory,
  filename: string,
  data: Uint8Array,
): Promise<{ url: string; key: string }> {
  const ext = filename.split(".").pop() ?? "png";
  const key = imageKey(category, ext);
  const contentType = guessContentType(filename);
  await putObject(key, data, contentType);
  const e = await env();
  const urlKey = fullKey(e.S3_KEY_PREFIX, key);
  return { url: `${await r2PublicUrl()}/${urlKey}`, key };
}
