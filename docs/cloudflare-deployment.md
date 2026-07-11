# Cloudflare Workers 部署经验总结

本项目使用 OpenNext (`@opennextjs/cloudflare`) 将 Next.js 16 应用部署到 Cloudflare Workers。以下是实际部署过程中踩过的坑和解决方案。

---

## 一、项目配置要点

### 1.1 `next.config.ts`

```ts
const nextConfig: NextConfig = {
  // OpenNext 强制要求 standalone 输出，不能移除
  output: "standalone",
  images: {
    // R2 公共域名直接访问，不做 Next 图片优化
    unoptimized: true,
  },
};

// 本地开发时初始化 OpenNext（注入 wrangler bindings）
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

export default withNextIntl(nextConfig);
```

**关键点**：
- `output: "standalone"` 是 OpenNext 的硬性要求，移除会导致构建失败
- `initOpenNextCloudflareForDev()` 只在 development 时调用，否则会影响生产构建

### 1.2 `open-next.config.ts`

```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

export default defineCloudflareConfig({
  // 只读静态资源缓存，不需要额外 R2 bucket
  incrementalCache: staticAssetsIncrementalCache,
  tagCache: "dummy",
});
```

**关键点**：
- 默认的 `r2IncrementalCache` 需要单独的 R2 bucket binding，如果不需要 ISR/revalidation，用 `staticAssetsIncrementalCache`
- `tagCache: "dummy"` 适用于不做按需重验证的场景

### 1.3 `wrangler.jsonc`

```jsonc
{
  "main": ".open-next/worker.js",
  "name": "mossgap",
  "compatibility_date": "2025-07-01",
  "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
  "assets": { "directory": ".open-next/assets", "binding": "ASSETS" },
  "services": [{ "binding": "WORKER_SELF_REFERENCE", "service": "mossgap" }],
  "d1_databases": [{ "binding": "DB", "database_name": "mossgap", "database_id": "<id>", "migrations_dir": "drizzle" }],
  "images": { "binding": "IMAGES" },
  "minify": true
}
```

**关键点**：
- `nodejs_compat` 必须开启，否则 Node.js API 不可用
- `minify: true` 减小 Worker 体积
- D1 通过 binding 注入，不通过环境变量
- 如果复用其他账号的 R2，**不要**配 `r2_buckets` binding，用 S3 兼容 API + 环境变量

### 1.4 `package.json` scripts

```json
{
  "scripts": {
    "build": "next build && opennextjs-cloudflare build --skipNextBuild",
    "build:deploy": "pnpm db:setup:remote && next build && opennextjs-cloudflare build --skipNextBuild",
    "db:migrate:remote": "wrangler d1 migrations apply mossgap --remote",
    "db:setup:remote": "pnpm db:migrate:remote && pnpm db:seed:remote && wrangler d1 execute mossgap --remote --file=seed-remote.sql",
    "db:seed:remote": "tsx scripts/seed.ts --remote"
  }
}
```

**Cloudflare Pages 配置**：
- Build command: `pnpm run build:deploy`（包含迁移 + seed + 构建）
- Deploy command: `npx wrangler deploy`（保持不变）

---

## 二、环境变量访问

### 2.1 核心问题

Cloudflare Workers 运行时中 `process.env` **不可用**（除了构建时注入的 `NEXT_PUBLIC_*`）。服务端密钥必须通过 `getCloudflareContext().env` 读取。

### 2.2 解决方案

`src/env.ts` 中的 `getServerEnv()` 和 `hasServerEnv()` 必须是 **async**，优先从 `getCloudflareContext().env` 读取，回退到 `process.env`（本地开发/seed 脚本）：

```ts
async function getRawEnv(): Promise<Record<string, string | undefined>> {
  const fromProcess = process.env as Record<string, string | undefined>;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    const fromCtx = ctx.env as unknown as Record<string, string | undefined>;
    return { ...fromProcess, ...fromCtx };
  } catch {
    return fromProcess;
  }
}
```

### 2.3 调用点更新

所有调用 `getServerEnv()` 和 `hasServerEnv()` 的地方都要加 `await`。注意级联影响：
- 如果 `oss.ts` 的 `env()` 变成 async，则 `r2PublicUrl()`、`publicObjectUrl()`、`extractKeyFromUrl()` 都会变成 async
- 进而影响 `db/queries.ts` 中的 `toPublicGame()` 等

### 2.4 环境变量配置位置

- **生产**：Cloudflare Dashboard -> Workers & Pages -> mossgap（Worker）-> Settings -> Variables and Secrets
- **本地**：`.dev.vars` 文件（OpenNext 优先读取，优先级高于 `.env.local`）

> **重要**：修改 `.env.local` 后如果发现本地还连旧配置，检查 `.dev.vars` 是否也需要同步更新。

---

## 三、Worker 体积优化

Cloudflare Workers 免费计划限制 **3 MiB**（压缩后），付费计划 10 MiB。

### 3.1 体积排查命令

```bash
# 查看构建产物大小（未压缩）
Get-ChildItem .open-next/server-functions/default/handler.mjs, .open-next/middleware/handler.mjs | Select Name, @{N="SizeKB";E={[math]::Round($_.Length/1KB,2)}}

# 部署时 wrangler 会显示压缩后大小，这才是计费体积
# Total Upload: 13833.20 KiB / gzip: 2295.89 KiB
# 只有 gzip 后的大小影响 3 MiB 限制
```

### 3.2 体积优化的核心认知（纠错）

> **重要纠正**：前期曾认为 `@aws-sdk/client-s3` 是体积元凶，实际验证后发现**影响很小**。真正的体积问题来自 **source map 缓存** 和 **不该打包到 Worker 的代码**。

#### 真正有效的优化手段

| 手段 | 效果 | 说明 |
|------|------|------|
| **清理构建缓存** | 17MB -> 3MB | 删除 `.next` / `.open-next` 后重新构建，避免旧的 source map 残留 |
| **关闭 Sentry source map 上传** | 显著减小 | source map 会被打包进 Worker，关闭后体积大降 |
| **启用 `wrangler.jsonc` 的 `minify: true`** | 再减 10-20% | 压缩代码 |
| **区分 server / browser 代码** | 视情况 | 只在浏览器用的代码不要 import 到 server 组件 |

#### 关于 `@aws-sdk/client-s3` 的正确认知

- `@aws-sdk/client-s3` **可以**留在 dependencies，对 Worker 体积影响很小
- OpenNext 的 tree-shaking 会只打包实际用到的代码
- 本项目目前用适配器模式（`oss-adapter-aws-sdk` + `oss-adapter-custom-s3`）两种实现并存，按需切换
- 如果后续仍然超限，可以切换到 custom 适配器（原生 fetch + Web Crypto 签名）

### 3.3 Source map 缓存问题（最常见的体积坑）

**症状**：本地代码已优化，但 CF 部署仍然超限，handler.mjs 体积异常大。

**原因**：CF Pages 构建时复用了缓存的 `.next` / `.open-next` 产物，旧的 source map 没被清理。

**解决方案**：
1. 在 `package.json` 中保留 `clean` 脚本，必要时手动执行：
   ```bash
   pnpm clean  # 删除 .next 和 .open-next
   ```
2. CF Dashboard 中手动清除构建缓存后重新部署
3. 如果需要每次构建都清理，在 build 命令前加 `pnpm clean`（但会增加构建时间，默认不加）

### 3.4 区分 server / browser 代码

**原则**：只在浏览器执行的代码不要 import 到 Server Components / Route Handlers，否则会被打包进 Worker。

- 客户端交互逻辑用 `"use client"` 标记
- 大型客户端库（如游戏引擎、编辑器）动态 import：`await import("xxx")`
- 注意 middleware 链路：`middleware.ts -> auth.ts -> queries.ts -> oss.ts`，链路上任何文件引入的依赖都会进 middleware bundle

### 3.5 Edge Runtime 兼容

`src/lib/oss.ts` 中不要 `import { randomUUID } from "node:crypto"`，改用全局 `crypto.randomUUID()`（Edge Runtime 兼容）。

middleware 链路上的文件如果引入 `node:crypto`，会污染整个 middleware 导致构建失败。

---

## 四、middleware / proxy 兼容性

### 4.1 Next.js 16 的 breaking change

Next.js 16 将 `middleware.ts` 改名为 `proxy.ts`，且默认走 **Node.js runtime**。但 OpenNext **不支持 Node.js middleware**。

### 4.2 解决方案

继续使用 `middleware.ts`（向后兼容，走 Edge Runtime），**不要**改成 `proxy.ts`。文件中不需要声明 `export const runtime = "edge"`。

### 4.3 警告可忽略

构建时会看到：
```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
```

这是 Next.js 的提示，OpenNext 目前只支持 `middleware.ts`，**忽略此警告**。

---

## 五、数据库迁移与 Seed

### 5.1 迁移系统

用 `wrangler d1 migrations apply` 自动跟踪迁移状态（通过 `d1_migrations` 表），不要手动执行每个 SQL 文件：

```bash
# 本地
pnpm db:migrate:local  # wrangler d1 migrations apply mossgap --local

# 远程
pnpm db:migrate:remote  # wrangler d1 migrations apply mossgap --remote
```

### 5.2 Seed 脚本

- `db:seed:local` - 通过 `getPlatformProxy` 连接本地 D1，用 Drizzle ORM 直接插入
- `db:seed:remote` - 生成幂等 SQL 写入 `seed-remote.sql`，再用 `wrangler d1 execute --remote` 执行

远程不能直接用 ORM 写，因为 `getPlatformProxy` 只能访问本地 D1。

### 5.3 首次迁移注意

如果远程 D1 之前用旧的 `wrangler d1 execute --file=xxx.sql` 手动执行过迁移，`d1_migrations` 表不存在但表已创建。此时 `migrations apply` 会报 "table already exists"。

解决方案：手动创建 `d1_migrations` 表并标记已执行的迁移，或清空远程 D1 重新开始。

---

## 六、Google Fonts 与本地构建

### 6.1 问题

`next/font/google` 在构建时需要访问 `fonts.googleapis.com`，国内网络或离线环境会构建失败：
```
next/font: error: Failed to fetch `Poppins` from Google Fonts.
```

### 6.2 解决方案

移除 `next/font/google`，改用系统字体栈。修改 `src/app/layout.tsx` 和 `src/app/globals.css`：

```css
--font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
--font-heading: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
--font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
```

---

## 七、Windows 本地构建问题

### 7.1 OpenNext symlink 错误

OpenNext 的 `copyTracedFiles.js` 在 Windows 上创建 symlink 时会报 `EPERM`：

```
Error: EPERM: operation not permitted, symlink '...' -> '...'
```

**这不是代码问题**，是 Windows 权限限制。解决方案：
1. 以**管理员身份**运行终端
2. 开启 **Windows 开发者模式**（设置 -> 隐私和安全性 -> 开发者模式）
3. 用 **WSL** 构建

Next.js build 部分能成功，只有 OpenNext 打包步骤需要 symlink 权限。CF 部署环境是 Linux，不存在此问题。

### 7.2 .open-next 目录锁定

构建时可能报 `EBUSY: resource busy or locked, rmdir '.open-next/assets'`。

解决：关闭所有占用该目录的进程（dev server、编辑器、资源管理器），或重启系统后重试。

---

## 八、部署 Checklist

### 8.1 代码提交前

- [ ] `src/env.ts` 中 `getServerEnv()` / `hasServerEnv()` 是 async，从 `getCloudflareContext().env` 读取
- [ ] 所有 `getServerEnv()` / `hasServerEnv()` 调用点已加 `await`
- [ ] `src/lib/oss.ts` 不依赖 `node:crypto`，用全局 `crypto.randomUUID()`
- [ ] `src/lib/oss.ts` 的 `signRequest` 保留 endpoint 原始协议（http/https）
- [ ] 使用 `middleware.ts` 而非 `proxy.ts`（OpenNext 兼容）
- [ ] `next.config.ts` 有 `output: "standalone"`
- [ ] 不使用 `next/font/google`（或确保构建环境能访问 Google Fonts）
- [ ] Sentry source map 已关闭（如使用 Sentry）
- [ ] `wrangler.jsonc` 启用 `minify: true`
- [ ] 只在浏览器用的代码用 `"use client"` 标记，不污染 server bundle

### 8.2 Cloudflare Dashboard 配置

- [ ] **Workers**（不是 Pages）-> mossgap -> Settings -> Variables and Secrets 中配置：
  - `S3_ENDPOINT`、`S3_REGION`、`S3_ACCESS_KEY_ID`、`S3_SECRET_ACCESS_KEY`、`S3_BUCKET`、`S3_PUBLIC_URL`、`S3_FORCE_PATH_STYLE`
  - `JWT_SECRET`（至少 16 字符）
- [ ] 敏感变量（access key、secret、JWT）设为 **Secret** 类型
- [ ] Build command: `pnpm run build:deploy`
- [ ] Deploy command: `npx wrangler deploy`

### 8.3 数据库

- [ ] `wrangler.jsonc` 中 `d1_databases` 的 `database_id` 是真实 ID
- [ ] 首次部署前执行 `pnpm db:migrate:remote`
- [ ] 首次部署前执行 `pnpm db:seed:remote && wrangler d1 execute mossgap --remote --file=seed-remote.sql`
- [ ] 后续部署由 `build:deploy` 自动执行迁移和 seed（幂等）

### 8.4 部署后验证

- [ ] 访问首页能正常渲染
- [ ] 访问 `/admin/login` 能登录（不报 SERVER_NOT_CONFIGURED）
- [ ] Workers -> Logs -> Real-time 中无 `[env] 环境变量校验失败` 日志
- [ ] 上传功能正常（如已实现）
- [ ] Worker 体积 < 3 MiB（免费计划）或 < 10 MiB（付费计划）

### 8.5 本地开发

- [ ] `.dev.vars` 和 `.env.local` 配置一致
- [ ] 执行过 `pnpm db:migrate:local` 和 `pnpm db:seed:local`
- [ ] `pnpm dev` 能正常启动，首页不报 `no such table`
- [ ] Windows 用户：以管理员身份运行终端或开启开发者模式

---

## 九、常见问题排查

### Q1: 部署后访问 API 报 "服务端环境变量未配置"

1. 检查 Workers（不是 Pages）的 Variables and Secrets 是否配置了所有 `S3_*` 和 `JWT_SECRET`
2. 查看 Workers 实时日志，确认 `[env] 环境变量校验失败` 具体提示哪个变量
3. 确认环境变量配置在 **Workers** 项目而不是 **Pages** 项目

### Q2: Worker 超过 3 MiB 限制

1. **先清理构建缓存**：`pnpm clean` 后重新构建，排除 source map 残留
2. 检查 Sentry source map 是否关闭
3. 启用 `wrangler.jsonc` 的 `minify: true`
4. 检查是否有只在浏览器用的代码被 import 到 server 组件（应标记 `"use client"` 或动态 import）
5. 看 wrangler 部署输出的 gzip 大小，不是原始大小

### Q3: CF 部署后代码没更新（仍是旧版本）

1. CF Pages 可能缓存了旧的 `.next`/`.open-next` 产物
2. 在 CF Dashboard 手动清除缓存后重新部署
3. 或在 build 脚本中加入清理步骤（`pnpm clean`）

### Q4: 本地 OSS 连的是旧配置

1. 检查 `.dev.vars`（OpenNext 优先读取，优先级高于 `.env.local`）
2. 同步更新 `.dev.vars` 和 `.env.local`
3. 重启 dev server

### Q5: 本地构建报 `no such table`

1. 执行 `pnpm db:migrate:local`
2. 执行 `pnpm db:seed:local`
3. 重启 dev server

### Q6: 本地构建报 SSL 错误（`ERR_SSL_PACKET_LENGTH_TOO_LONG`）

`oss.ts` 的 `signRequest` 强制把 endpoint 转成 `https://`，但本地 MinIO 是 `http://`。保留 endpoint 原始协议。
