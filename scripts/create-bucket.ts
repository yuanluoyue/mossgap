import { AwsClient } from "aws4fetch";

/**
 * 本地 MinIO 创建 bucket 脚本。
 * 使用 aws4fetch 替代 @aws-sdk/client-s3，避免 Node.js fs 依赖。
 */

async function main() {
  const endpoint = "http://localhost:9000";
  const bucket = "mossgap-games";

  const client = new AwsClient({
    accessKeyId: "minioadmin",
    secretAccessKey: "minioadmin",
    service: "s3",
    region: "us-east-1",
  });

  // HeadBucket: GET /<bucket>，404 表示不存在
  const headRes = await client.fetch(`${endpoint}/${bucket}`, {
    method: "HEAD",
  });
  if (headRes.ok) {
    console.log("bucket already exists");
    return;
  }

  // CreateBucket: PUT /<bucket>
  const createRes = await client.fetch(`${endpoint}/${bucket}`, {
    method: "PUT",
  });
  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`CreateBucket failed (${createRes.status}): ${text}`);
  }
  console.log(`bucket created: ${bucket}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
