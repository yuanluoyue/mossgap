import { getServerEnv } from "@/env";
import type { OssAdapter } from "./oss-adapter";
import { awsSdkAdapter } from "./oss-adapter-aws-sdk";
import { customS3Adapter } from "./oss-adapter-custom-s3";

/**
 * S3 兼容对象存储客户端。
 *
 * 通过适配器模式支持两种实现：
 * - aws-sdk（默认）：使用 @aws-sdk/client-s3，功能完整、自动重试
 * - custom：手写 AWS Signature V4 + fetch，无第三方依赖、体积最小
 *
 * 所有对外暴露的 key 均为逻辑 key（不含 S3_KEY_PREFIX），
 * 适配器接收的是完整 key（已拼接前缀）。
 */

async function env() {
  return await getServerEnv();
}

// ===== 适配器选择 =====

let cachedAdapter: OssAdapter | null = null;

async function getAdapter(): Promise<OssAdapter> {
  if (cachedAdapter) return cachedAdapter;
  const e = await env();
  cachedAdapter = e.OSS_ADAPTER === "custom" ? customS3Adapter : awsSdkAdapter;
  return cachedAdapter;
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
  const adapter = await getAdapter();
  await adapter.putObject(fullKey(e.S3_KEY_PREFIX, key), body, contentType);
}

/** 批量上传多个文件。 */
export async function putObjects(
  prefix: string,
  files: { path: string; data: Uint8Array }[],
): Promise<void> {
  await Promise.all(
    files.map((f) =>
      putObject(joinKey(prefix, f.path), f.data, guessContentType(f.path)),
    ),
  );
}

/** 删除单个对象。 */
export async function deleteObject(key: string): Promise<void> {
  const e = await env();
  const adapter = await getAdapter();
  await adapter.deleteObject(fullKey(e.S3_KEY_PREFIX, key));
}

/** 删除某前缀下所有对象（递归清理）。 */
export async function deletePrefix(prefix: string): Promise<void> {
  const e = await env();
  const adapter = await getAdapter();
  const fullPrefix = fullKey(e.S3_KEY_PREFIX, prefix).replace(/^\/+|\/+$/g, "");
  const objects = await adapter.listObjects(fullPrefix);
  if (objects.length > 0) {
    await adapter.deleteObjects(objects.map((o) => o.key));
  }
}

/** 列出某前缀下所有对象，返回逻辑 key 与 size 列表。 */
export async function listPrefixObjects(
  prefix: string,
): Promise<{ key: string; size: number }[]> {
  const e = await env();
  const adapter = await getAdapter();
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
