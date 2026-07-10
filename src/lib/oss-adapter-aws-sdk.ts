import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getServerEnv } from "@/env";
import type { OssAdapter } from "./oss-adapter";

let cachedClient: S3Client | null = null;
let cachedBucket: string | null = null;

/** 获取缓存的 S3Client 实例（复用连接，避免每次请求都创建新客户端）。 */
async function getClient(): Promise<{ client: S3Client; bucket: string }> {
  if (cachedClient && cachedBucket) {
    return { client: cachedClient, bucket: cachedBucket };
  }
  const e = await getServerEnv();
  cachedClient = new S3Client({
    endpoint: e.S3_ENDPOINT,
    region: e.S3_REGION || "auto",
    credentials: {
      accessKeyId: e.S3_ACCESS_KEY_ID,
      secretAccessKey: e.S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: e.S3_FORCE_PATH_STYLE,
    // SDK 内置重试，覆盖连接超时等瞬时错误
    maxAttempts: 3,
  });
  cachedBucket = e.S3_BUCKET;
  return { client: cachedClient, bucket: cachedBucket };
}

/** S3 批量删除上限（每次最多 1000 条 key）。 */
const BATCH_DELETE_LIMIT = 1000;

export const awsSdkAdapter: OssAdapter = {
  async putObject(key, body, contentType) {
    const { client, bucket } = await getClient();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: "public-read",
      }),
    );
  },

  async deleteObject(key) {
    const { client, bucket } = await getClient();
    // S3 DELETE 是幂等的，对象不存在时也返回 204
    await client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key }),
    );
  },

  async deleteObjects(keys) {
    if (keys.length === 0) return;
    const { client, bucket } = await getClient();
    // 分批删除，每批最多 1000 条
    for (let i = 0; i < keys.length; i += BATCH_DELETE_LIMIT) {
      const chunk = keys.slice(i, i + BATCH_DELETE_LIMIT);
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: chunk.map((k) => ({ Key: k })),
          },
        }),
      );
    }
  },

  async listObjects(prefix) {
    const { client, bucket } = await getClient();
    const items: { key: string; size: number }[] = [];
    let continuationToken: string | undefined;
    do {
      const res = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      for (const obj of res.Contents ?? []) {
        if (obj.Key) {
          items.push({ key: obj.Key, size: obj.Size ?? 0 });
        }
      }
      continuationToken = res.NextContinuationToken;
    } while (continuationToken);
    return items;
  },
};
