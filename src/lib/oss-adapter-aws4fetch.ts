import { AwsClient } from "aws4fetch";
import { getServerEnv } from "@/env";
import type { OssAdapter } from "./oss-adapter";

let cachedClient: AwsClient | null = null;
let cachedBucket: string | null = null;

/**
 * 获取缓存的 aws4fetch 客户端实例。
 * aws4fetch 基于 fetch + Web Crypto 实现 AWS Signature V4，
 * 不依赖 Node.js fs，可在 Cloudflare Workers 上安全运行。
 */
async function getClient(): Promise<{ client: AwsClient; bucket: string }> {
  if (cachedClient && cachedBucket) {
    return { client: cachedClient, bucket: cachedBucket };
  }
  const e = await getServerEnv();
  cachedClient = new AwsClient({
    accessKeyId: e.S3_ACCESS_KEY_ID,
    secretAccessKey: e.S3_SECRET_ACCESS_KEY,
    service: "s3",
    region: e.S3_REGION || "auto",
  });
  cachedBucket = e.S3_BUCKET;
  return { client: cachedClient, bucket: cachedBucket };
}

/** 构造请求 URL（根据 S3_FORCE_PATH_STYLE 决定 path-style 或 virtual-host-style）。 */
function buildUrl(
  endpoint: string,
  bucket: string,
  key: string,
  pathStyle: boolean,
  queryParams: Record<string, string> = {},
): string {
  const base = endpoint.replace(/\/$/, "");
  const objectPath = key ? `/${key}` : "/";
  const qs = Object.keys(queryParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join("&");
  const queryString = qs ? `?${qs}` : "";

  if (pathStyle) {
    return `${base}/${bucket}${objectPath}${queryString}`;
  }
  // virtual-host-style: https://<bucket>.<host>/<key>
  const host = base.replace(/^https?:\/\//, "");
  const protocol = base.startsWith("https://") ? "https:" : "http:";
  return `${protocol}//${bucket}.${host}${objectPath}${queryString}`;
}

export const aws4FetchAdapter: OssAdapter = {
  async putObject(key, body, contentType) {
    const { client, bucket } = await getClient();
    const e = await getServerEnv();
    const url = buildUrl(e.S3_ENDPOINT, bucket, key, e.S3_FORCE_PATH_STYLE);
    const res = await client.fetch(url, {
      method: "PUT",
      body: body as BodyInit,
      headers: {
        "Content-Type": contentType,
        "x-amz-acl": "public-read",
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`S3 PUT failed (${res.status}): ${text}`);
    }
  },

  async deleteObject(key) {
    const { client, bucket } = await getClient();
    const e = await getServerEnv();
    const url = buildUrl(e.S3_ENDPOINT, bucket, key, e.S3_FORCE_PATH_STYLE);
    const res = await client.fetch(url, { method: "DELETE" });
    // S3 DELETE 是幂等的，对象不存在时也返回 204
    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      throw new Error(`S3 DELETE failed (${res.status}): ${text}`);
    }
  },

  async deleteObjects(keys) {
    // 逐个删除：R2 批量删除需要 Content-MD5 header，
    // 而 Web Crypto 不支持 MD5，故改用逐个 DELETE（幂等、可并发）
    await Promise.all(keys.map((k) => this.deleteObject(k)));
  },

  async listObjects(prefix) {
    const { client, bucket } = await getClient();
    const e = await getServerEnv();
    const p = prefix.replace(/^\/+|\/+$/g, "");
    const items: { key: string; size: number }[] = [];
    let continuationToken: string | undefined;
    do {
      const params: Record<string, string> = {
        "list-type": "2",
        prefix: p ? `${p}/` : "",
      };
      if (continuationToken) params["continuation-token"] = continuationToken;
      const url = buildUrl(e.S3_ENDPOINT, bucket, "", e.S3_FORCE_PATH_STYLE, params);
      const res = await client.fetch(url, { method: "GET" });
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
