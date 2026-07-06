import { S3Client, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";

async function main() {
  const c = new S3Client({
    endpoint: "http://localhost:9000",
    region: "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: "minioadmin",
      secretAccessKey: "minioadmin",
    },
  });
  try {
    await c.send(new HeadBucketCommand({ Bucket: "mossgap-games" }));
    console.log("bucket already exists");
  } catch {
    await c.send(new CreateBucketCommand({ Bucket: "mossgap-games" }));
    console.log("bucket created: mossgap-games");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
