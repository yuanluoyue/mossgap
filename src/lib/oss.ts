import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { getServerEnv } from "@/env";

/**
 * S3 兼容对象存储客户端。
 *
 * - 生产：Cloudflare R2（通过 S3_ENDPOINT 指向 R2 的 S3 endpoint）。
 * - 本地：Docker MinIO（S3_ENDPOINT=http://localhost:9000，开启 path-style）。
 *
 * 在 Cloudflare Workers 上通过 nodejs_compat 兼容标志运行。
 */
let _client: S3Client | null = null;

export function getS3(): S3Client {
  if (_client) return _client;
  const env = getServerEnv();
  _client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
  return _client;
}

/** 兼容旧代码：保留 getR2 别名。 */
export const getR2 = getS3;

function bucketName(): string {
  return getServerEnv().S3_BUCKET;
}

/** 对象公共访问域名（去尾斜杠）。 */
export function r2PublicUrl(): string {
  return getServerEnv().S3_PUBLIC_URL.replace(/\/$/, "");
}

/** 拼接某对象在公共域名下的完整 URL。 */
export function publicObjectUrl(ossPrefix: string, relativePath: string): string {
  const key = joinKey(ossPrefix, relativePath);
  return `${r2PublicUrl()}/${key}`;
}

function joinKey(prefix: string, relative: string): string {
  const p = prefix.replace(/^\/+|\/+$/g, "");
  const r = relative.replace(/^\/+/, "");
  return p ? `${p}/${r}` : r;
}

/** 上传单个文件到对象存储。 */
export async function putObject(
  key: string,
  body: Uint8Array | string,
  contentType: string,
): Promise<void> {
  const client = getS3();
  await client.send(
    new PutObjectCommand({
      Bucket: bucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: "public-read",
    }),
  );
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
  const client = getS3();
  await client.send(
    new DeleteObjectCommand({ Bucket: bucketName(), Key: key }),
  );
}

/** 删除某前缀下所有对象（递归清理游戏目录）。 */
export async function deletePrefix(prefix: string): Promise<void> {
  const client = getS3();
  const bucket = bucketName();
  const p = prefix.replace(/^\/+|\/+$/g, "");
  let continuationToken: string | undefined;
  do {
    const list = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: p ? `${p}/` : "",
        ContinuationToken: continuationToken,
      }),
    );
    const objects = (list.Contents ?? []).map((o) => ({ Key: o.Key! }));
    if (objects.length > 0) {
      await client.send(
        new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objects } }),
      );
    }
    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (continuationToken);
}

/** 列出某前缀下所有对象，返回 key 与 size 列表。 */
export async function listPrefixObjects(
  prefix: string,
): Promise<{ key: string; size: number }[]> {
  const client = getS3();
  const bucket = bucketName();
  const p = prefix.replace(/^\/+|\/+$/g, "");
  const items: { key: string; size: number }[] = [];
  let continuationToken: string | undefined;
  do {
    const list = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: p ? `${p}/` : "",
        ContinuationToken: continuationToken,
      }),
    );
    for (const o of list.Contents ?? []) {
      items.push({ key: o.Key!, size: o.Size ?? 0 });
    }
    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (continuationToken);
  return items;
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

/** 简易 Content-Type 推断。 */
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

/** 图片资源类型 → OSS 前缀映射。不同资源在桶内分区存放。 */
const IMAGE_PREFIXES = {
  cover: "images/covers",
  screenshot: "images/screenshots",
} as const;

export type ImageCategory = keyof typeof IMAGE_PREFIXES;

/** 允许上传的图片扩展名。 */
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg"] as const;

/**
 * 生成图片在 OSS 上的 key。
 * 规则：`images/{category}/{uuid}.{ext}`
 */
export function imageKey(category: ImageCategory, ext: string): string {
  const safeExt = ext.toLowerCase().replace(/^\.+/, "");
  const prefix = IMAGE_PREFIXES[category];
  return `${prefix}/${randomUUID()}.${safeExt}`;
}

/** 校验文件扩展名是否为允许的图片类型。 */
export function isAllowedImageExt(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return (IMAGE_EXTENSIONS as readonly string[]).includes(ext);
}

/**
 * 从公共 URL 中提取 OSS key。
 * 如果 URL 不属于当前 bucket 域名则返回 null。
 */
export function extractKeyFromUrl(url: string): string | null {
  if (!url) return null;
  const base = r2PublicUrl();
  if (!url.startsWith(base)) return null;
  return decodeURIComponent(url.slice(base.length + 1));
}

/**
 * 上传图片到 OSS 并返回公共 URL。
 * @param category 资源类型（cover / screenshot）
 * @param filename 原始文件名（用于推断扩展名和 Content-Type）
 * @param data 文件二进制数据
 */
export async function putImage(
  category: ImageCategory,
  filename: string,
  data: Uint8Array,
): Promise<{ url: string; key: string }> {
  const ext = filename.split(".").pop() ?? "png";
  const key = imageKey(category, ext);
  const contentType = guessContentType(filename);
  await putObject(key, data, contentType);
  return { url: `${r2PublicUrl()}/${key}`, key };
}
