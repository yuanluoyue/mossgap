import { randomUUID } from "node:crypto";
import { getServerEnv } from "@/env";

/**
 * S3 兼容对象存储客户端（轻量版，无 AWS SDK 依赖）。
 *
 * 直接用原生 fetch + Web Crypto API 实现 AWS Signature V4 签名，
 * 完全移除 @aws-sdk/client-s3 以减小 Cloudflare Worker 体积。
 *
 * - 生产：Cloudflare R2
 * - 本地：Docker MinIO（path-style）
 */

function env() {
  return getServerEnv();
}

/** 构建规范请求并签名，返回完整请求 URL + headers。 */
async function signRequest(
  method: string,
  bucket: string,
  key: string,
  body: Uint8Array | string | null,
  contentType: string,
  queryParams: Record<string, string> = {},
): Promise<{ url: string; headers: Record<string, string> }> {
  const e = env();
  const region = e.S3_REGION || "auto";
  const service = "s3";
  const accessKey = e.S3_ACCESS_KEY_ID;
  const secretKey = e.S3_SECRET_ACCESS_KEY;
  const endpoint = e.S3_ENDPOINT.replace(/\/$/, "");
  const pathStyle = e.S3_FORCE_PATH_STYLE;

  // 构建请求路径和 URL
  const objectPath = key ? `/${key}` : "/";
  const pathForSign = pathStyle ? `/${bucket}${objectPath}` : objectPath;

  // query string
  const sortedQuery = Object.keys(queryParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join("&");
  const queryString = sortedQuery ? `?${sortedQuery}` : "";

  // 构建 host 和 URL
  let host: string;
  let urlPath: string;
  if (pathStyle) {
    host = endpoint.replace(/^https?:\/\//, "");
    urlPath = `/${bucket}${objectPath}`;
  } else {
    host = `${bucket}.${endpoint.replace(/^https?:\/\//, "")}`;
    urlPath = objectPath;
  }
  const url = `${endpoint.replace(/^https?:\/\//, "https://")}${urlPath}${queryString}`;

  // 时间戳
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  // payload hash（空 body 用空字符串的 SHA-256）
  const bodyBytes =
    body === null ? new Uint8Array(0) : typeof body === "string" ? new TextEncoder().encode(body) : body;
  const payloadHash = await sha256Hex(bodyBytes);

  // headers
  const headers: Record<string, string> = {
    host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
  };
  if (contentType) headers["content-type"] = contentType;
  if (body !== null) headers["content-length"] = String(bodyBytes.length);

  // 规范请求
  const signedHeaderKeys = Object.keys(headers)
    .map((k) => k.toLowerCase())
    .sort();
  const signedHeadersStr = signedHeaderKeys.join(";");
  const canonicalHeaders = signedHeaderKeys
    .map((k) => `${k}:${headers[k]}\n`)
    .join("");
  const canonicalRequest = [
    method,
    pathForSign,
    queryString,
    canonicalHeaders,
    signedHeadersStr,
    payloadHash,
  ].join("\n");

  // 待签字符串
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(new TextEncoder().encode(canonicalRequest)),
  ].join("\n");

  // 计算签名
  const signingKey = await deriveSigningKey(secretKey, dateStamp, region, service);
  const signature = await hmacSha256Hex(signingKey, stringToSign);

  // 组装 Authorization header
  const authHeader = [
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}`,
    `SignedHeaders=${signedHeadersStr}`,
    `Signature=${signature}`,
  ].join(", ");
  headers.authorization = authHeader;

  return { url, headers };
}

// ===== Web Crypto 辅助函数 =====

async function sha256Hex(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data.buffer as ArrayBuffer);
  return bufToHex(new Uint8Array(hash));
}

async function hmacSha256(key: Uint8Array, data: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

async function hmacSha256Hex(key: Uint8Array, data: string): Promise<string> {
  const sig = await hmacSha256(key, data);
  return bufToHex(sig);
}

async function deriveSigningKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Promise<Uint8Array> {
  const kSecret = new TextEncoder().encode(`AWS4${secretKey}`);
  const kDate = await hmacSha256(kSecret, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return await hmacSha256(kService, "aws4_request");
}

function bufToHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ===== 公共 API =====

/** 对象公共访问域名（去尾斜杠）。 */
export function r2PublicUrl(): string {
  return env().S3_PUBLIC_URL.replace(/\/$/, "");
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
  const { url, headers } = await signRequest(
    "PUT",
    env().S3_BUCKET,
    key,
    body,
    contentType,
  );
  const res = await fetch(url, {
    method: "PUT",
    headers: { ...headers, "x-amz-acl": "public-read" },
    body: body as BodyInit,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`S3 PUT failed (${res.status}): ${text}`);
  }
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
  const { url, headers } = await signRequest(
    "DELETE",
    env().S3_BUCKET,
    key,
    null,
    "",
  );
  const res = await fetch(url, { method: "DELETE", headers });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`S3 DELETE failed (${res.status}): ${text}`);
  }
}

/** 删除某前缀下所有对象（递归清理）。 */
export async function deletePrefix(prefix: string): Promise<void> {
  const bucket = env().S3_BUCKET;
  const p = prefix.replace(/^\/+|\/+$/g, "");
  let continuationToken: string | undefined;
  do {
    const params: Record<string, string> = {
      "list-type": "2",
      prefix: p ? `${p}/` : "",
    };
    if (continuationToken) params["continuation-token"] = continuationToken;

    const { url, headers } = await signRequest(
      "GET",
      bucket,
      "",
      null,
      "",
      params,
    );
    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`S3 LIST failed (${res.status}): ${text}`);
    }
    const xml = await res.text();
    const keys = parseListKeys(xml);
    const nextToken = parseNextToken(xml);

    if (keys.length > 0) {
      // 批量删除（每个单独删除，避免 POST XML body 签名复杂度）
      await Promise.all(keys.map((k) => deleteObject(k)));
    }
    continuationToken = nextToken;
  } while (continuationToken);
}

/** 列出某前缀下所有对象，返回 key 与 size 列表。 */
export async function listPrefixObjects(
  prefix: string,
): Promise<{ key: string; size: number }[]> {
  const bucket = env().S3_BUCKET;
  const p = prefix.replace(/^\/+|\/+$/g, "");
  const items: { key: string; size: number }[] = [];
  let continuationToken: string | undefined;
  do {
    const params: Record<string, string> = {
      "list-type": "2",
      prefix: p ? `${p}/` : "",
    };
    if (continuationToken) params["continuation-token"] = continuationToken;

    const { url, headers } = await signRequest(
      "GET",
      bucket,
      "",
      null,
      "",
      params,
    );
    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`S3 LIST failed (${res.status}): ${text}`);
    }
    const xml = await res.text();
    const objects = parseListObjects(xml);
    items.push(...objects);
    continuationToken = parseNextToken(xml);
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

// ===== XML 解析辅助 =====

function parseListObjects(xml: string): { key: string; size: number }[] {
  const items: { key: string; size: number }[] = [];
  const regex = /<Contents>([\s\S]*?)<\/Contents>/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    const block = match[1];
    const key = extractXmlTag(block, "Key");
    const sizeStr = extractXmlTag(block, "Size");
    if (key) {
      items.push({ key, size: sizeStr ? parseInt(sizeStr, 10) : 0 });
    }
  }
  return items;
}

function parseListKeys(xml: string): string[] {
  return parseListObjects(xml).map((o) => o.key);
}

function parseNextToken(xml: string): string | undefined {
  const token = extractXmlTag(xml, "NextContinuationToken");
  const isTruncated = extractXmlTag(xml, "IsTruncated");
  if (token && isTruncated === "true") return token;
  return undefined;
}

function extractXmlTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`);
  const match = regex.exec(xml);
  return match ? match[1] : null;
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
  return `${prefix}/${randomUUID()}.${safeExt}`;
}

export function isAllowedImageExt(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return (IMAGE_EXTENSIONS as readonly string[]).includes(ext);
}

export function extractKeyFromUrl(url: string): string | null {
  if (!url) return null;
  const base = r2PublicUrl();
  if (!url.startsWith(base)) return null;
  return decodeURIComponent(url.slice(base.length + 1));
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
  return { url: `${r2PublicUrl()}/${key}`, key };
}
