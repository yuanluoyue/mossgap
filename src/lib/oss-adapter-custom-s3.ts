import { getServerEnv } from "@/env";
import type { OssAdapter } from "./oss-adapter";

/**
 * 手写 AWS Signature V4 + fetch 的 S3 兼容适配器。
 *
 * 不依赖任何第三方 SDK，体积最小。
 * 适合对 Worker bundle 体积有严格要求的场景。
 */

async function env() {
  return await getServerEnv();
}

// ===== 网络重试 =====

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      lastError = err;
      if (attempt === retries) break;
      const isTransient =
        err instanceof TypeError ||
        (err as { code?: string })?.code === "UND_ERR_CONNECT_TIMEOUT";
      if (!isTransient) break;
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(
        `[oss] fetch 失败（第 ${attempt + 1} 次），${delay}ms 后重试:`,
        err instanceof Error ? err.message : err,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// ===== AWS Signature V4 签名 =====

async function signRequest(
  method: string,
  bucket: string,
  key: string,
  body: Uint8Array | string | null,
  contentType: string,
  queryParams: Record<string, string> = {},
): Promise<{ url: string; headers: Record<string, string> }> {
  const e = await env();
  const region = e.S3_REGION || "auto";
  const service = "s3";
  const accessKey = e.S3_ACCESS_KEY_ID;
  const secretKey = e.S3_SECRET_ACCESS_KEY;
  const endpoint = e.S3_ENDPOINT.replace(/\/$/, "");
  const pathStyle = e.S3_FORCE_PATH_STYLE;

  const objectPath = key ? `/${key}` : "/";
  const pathForSign = pathStyle ? `/${bucket}${objectPath}` : objectPath;

  const sortedQuery = Object.keys(queryParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join("&");
  const queryString = sortedQuery ? `?${sortedQuery}` : "";

  const protocol = endpoint.startsWith("https://") ? "https:" : "http:";
  let host: string;
  let urlPath: string;
  if (pathStyle) {
    host = endpoint.replace(/^https?:\/\//, "");
    urlPath = `/${bucket}${objectPath}`;
  } else {
    host = `${bucket}.${endpoint.replace(/^https?:\/\//, "")}`;
    urlPath = objectPath;
  }
  const url = `${protocol}//${host}${urlPath}${queryString}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const bodyBytes =
    body === null ? new Uint8Array(0) : typeof body === "string" ? new TextEncoder().encode(body) : body;
  const payloadHash = await sha256Hex(bodyBytes);

  const headers: Record<string, string> = {
    host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
  };
  if (contentType) headers["content-type"] = contentType;
  if (body !== null) headers["content-length"] = String(bodyBytes.length);

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

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(new TextEncoder().encode(canonicalRequest)),
  ].join("\n");

  const signingKey = await deriveSigningKey(secretKey, dateStamp, region, service);
  const signature = await hmacSha256Hex(signingKey, stringToSign);

  const authHeader = [
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}`,
    `SignedHeaders=${signedHeadersStr}`,
    `Signature=${signature}`,
  ].join(", ");
  headers.authorization = authHeader;

  return { url, headers };
}

// ===== Web Crypto 辅助 =====

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

// ===== XML 解析 =====

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

// ===== 适配器实现 =====

export const customS3Adapter: OssAdapter = {
  async putObject(key, body, contentType) {
    const e = await env();
    const { url, headers } = await signRequest("PUT", e.S3_BUCKET, key, body, contentType);
    const res = await fetchWithRetry(url, {
      method: "PUT",
      headers: { ...headers, "x-amz-acl": "public-read" },
      body: body as BodyInit,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`S3 PUT failed (${res.status}): ${text}`);
    }
  },

  async deleteObject(key) {
    const e = await env();
    const { url, headers } = await signRequest("DELETE", e.S3_BUCKET, key, null, "");
    const res = await fetchWithRetry(url, { method: "DELETE", headers });
    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      throw new Error(`S3 DELETE failed (${res.status}): ${text}`);
    }
  },

  async deleteObjects(keys) {
    // 手写实现不支持批量删除，逐个删除
    await Promise.all(keys.map((k) => this.deleteObject(k)));
  },

  async listObjects(prefix) {
    const e = await env();
    const p = prefix.replace(/^\/+|\/+$/g, "");
    const items: { key: string; size: number }[] = [];
    let continuationToken: string | undefined;
    do {
      const params: Record<string, string> = {
        "list-type": "2",
        prefix: p ? `${p}/` : "",
      };
      if (continuationToken) params["continuation-token"] = continuationToken;

      const { url, headers } = await signRequest("GET", e.S3_BUCKET, "", null, "", params);
      const res = await fetchWithRetry(url, { method: "GET", headers });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`S3 LIST failed (${res.status}): ${text}`);
      }
      const xml = await res.text();
      items.push(...parseListObjects(xml));
      continuationToken = parseNextToken(xml);
    } while (continuationToken);
    return items;
  },
};
