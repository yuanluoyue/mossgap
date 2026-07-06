/**
 * 数据库 seed 脚本。
 *
 * 用法：
 *   pnpm db:seed:local   # 在本地 wrangler D1 中插入 admin/123456
 *   pnpm db:seed:remote  # 打印远程 D1 执行所需的 SQL（需手动用 wrangler 执行）
 *
 * 说明：
 * - admin 账号存数据库 admins 表，密码用 PBKDF2 哈希。
 * - 已存在同名 admin 时跳过（local）或提示（remote）。
 */
import { getPlatformProxy } from "wrangler";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { admins } from "../src/db/schema";
import { hashPassword } from "../src/lib/password";

const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "123456";

async function seedLocal() {
  const proxy = await getPlatformProxy({ configPath: "./wrangler.jsonc" });
  try {
    const db = drizzle(proxy.env.DB as D1Database, { schema: { admins } });

    const existing = await db
      .select({ id: admins.id })
      .from(admins)
      .where(eq(admins.username, DEFAULT_USERNAME))
      .limit(1);
    if (existing.length > 0) {
      console.log(`[skip] admin "${DEFAULT_USERNAME}" 已存在`);
      return;
    }

    const passwordHash = await hashPassword(DEFAULT_PASSWORD);
    await db.insert(admins).values({
      username: DEFAULT_USERNAME,
      passwordHash,
    });
    console.log(`[ok] 已插入 admin: ${DEFAULT_USERNAME} / ${DEFAULT_PASSWORD}`);
  } finally {
    await proxy.dispose();
  }
}

async function seedRemote() {
  // remote 模式下不能直接通过 binding 写入，生成 SQL 交给 wrangler 执行
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  const now = Math.floor(Date.now() / 1000);
  const id = crypto.randomUUID();
  // 转义单引号
  const sql = `INSERT INTO admins (id, username, password_hash, created_at, updated_at) VALUES ('${id}', '${DEFAULT_USERNAME}', '${passwordHash.replace(/'/g, "''")}', ${now}, ${now});`;

  console.log("===== Remote Seed SQL =====");
  console.log(sql);
  console.log();
  console.log("执行命令（PowerShell）：");
  console.log(
    `wrangler d1 execute mossgap --remote --command "${sql.replace(/"/g, '`"')}"`,
  );
  console.log();
  console.log(
    `或保存为 seed.sql 后执行：wrangler d1 execute mossgap --remote --file=seed.sql`,
  );
  console.log();
  console.log("注意：执行前请先运行 pnpm db:migrate:remote 创建表结构。");
}

async function main() {
  const args = process.argv.slice(2);
  const isRemote = args.includes("--remote");
  const isLocal = args.includes("--local");

  if (!isLocal && !isRemote) {
    console.error("用法: tsx scripts/seed.ts --local | --remote");
    process.exit(1);
  }

  if (isRemote) {
    await seedRemote();
  } else {
    await seedLocal();
  }
}

main().catch((err) => {
  console.error("[error]", err);
  process.exit(1);
});
