import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
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
