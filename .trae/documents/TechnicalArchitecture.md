# MossGap 游戏平台技术架构

## 1. 架构设计

```mermaid
flowchart TB
    subgraph Client["客户端"]
        C1["C 端浏览器<br/>Next.js RSC + Client"]
        C2["Admin 浏览器<br/>Next.js RSC + Client"]
    end

    subgraph Edge["Cloudflare 边缘"]
        CF["Cloudflare Workers/Pages<br/>@opennextjs/cloudflare"]
    end

    subgraph Services["后端服务"]
        API["Next.js Route Handlers<br/>Server Actions"]
        OSS["Cloudflare R2<br/>S3 兼容存储"]
    end

    subgraph Data["数据层"]
        DB[("Neon PostgreSQL<br/>Serverless")]
        DR["Drizzle ORM"]
    end

    C1 --> CF
    C2 --> CF
    CF --> API
    API --> DR
    DR --> DB
    API --> OSS
    C1 -.iframe.-> OSS
```

## 2. 技术说明

- **前端框架**：Next.js 15（App Router，React 19，RSC）
- **样式方案**：Tailwind CSS 4 + shadcn/ui（Radix UI + CVA）
- **国际化**：next-intl（C 端中英双语，英文优先；Admin 仅中文）
- **ORM**：Drizzle ORM + drizzle-kit（迁移管理）
- **数据库**：Neon PostgreSQL（Serverless，兼容 Cloudflare 环境）
- **对象存储**：Cloudflare R2（S3 兼容，免出口流量费）
- **Zip 处理**：unzipit / fflate（边缘运行时兼容，纯 JS 实现）
- **部署平台**：Cloudflare Workers/Pages（通过 @opennextjs/cloudflare 适配）
- **运行时**：Cloudflare Workers Runtime（Edge Runtime 兼容）
- **包管理**：pnpm
- **TypeScript**：5.x，严格模式
- **校验**：Zod（schema 校验，前后端共享）
- **认证**：Admin 端采用简单的环境变量密码 + JWT Cookie（初期不接外部认证）

## 3. 路由定义

### 3.1 C 端路由（多语言前缀，英文为默认）

| 路由 | 用途 |
|------|------|
| `/` | 重定向至 `/en` |
| `/en` | C 端首页（英文） |
| `/zh` | C 端首页（中文） |
| `/[locale]/games` | 游戏列表页 |
| `/[locale]/games/[slug]` | 游戏详情页 |
| `/[locale]/play/[slug]` | 游戏游玩页（iframe） |
| `/[locale]/about` | 关于页面（可选） |

### 3.2 Admin 路由（中文，无 i18n 前缀）

| 路由 | 用途 |
|------|------|
| `/admin/login` | 管理员登录 |
| `/admin` | 控制台首页 |
| `/admin/games` | 游戏管理列表 |
| `/admin/games/new` | 上传新游戏 |
| `/admin/games/[id]` | 编辑游戏 |

### 3.3 API 路由

| 路由 | 方法 | 用途 |
|------|------|------|
| `/api/admin/login` | POST | 管理员登录 |
| `/api/admin/logout` | POST | 管理员登出 |
| `/api/admin/games` | GET/POST | 游戏列表/创建 |
| `/api/admin/games/[id]` | GET/PATCH/DELETE | 游戏详情/更新/删除 |
| `/api/admin/upload` | POST | 上传 Zip 游戏包 |
| `/api/games` | GET | C 端公开游戏列表 |
| `/api/games/[slug]` | GET | C 端公开游戏详情 |

## 4. API 定义

### 4.1 类型定义（src/types/index.ts）

```typescript
// 游戏状态
export type GameStatus = 'draft' | 'published' | 'archived';

// 游戏分类
export type GameCategory =
  | 'action'
  | 'puzzle'
  | 'arcade'
  | 'adventure'
  | 'strategy'
  | 'sports'
  | 'racing'
  | 'other';

// 游戏记录
export interface Game {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: GameCategory;
  coverImage: string;        // 封面图 OSS 路径
  screenshots: string[];     // 截图 OSS 路径数组
  entryFile: string;         // 游戏入口文件（相对路径，如 index.html）
  ossPrefix: string;         // OSS 存储前缀（如 games/abc-123/）
  status: GameStatus;
  playCount: number;
  locale: Record<'en' | 'zh', { title: string; description: string }>; // 多语言元信息
  createdAt: string;
  updatedAt: string;
}

// 上传 Zip 请求
export interface UploadGameRequest {
  // multipart/form-data：file=Zip 文件
}

// 上传 Zip 响应
export interface UploadGameResponse {
  id: string;
  ossPrefix: string;
  detectedEntry: string | null; // 自动检测的入口文件
  files: { path: string; size: number }[];
}

// 创建/更新游戏请求
export interface UpsertGameRequest {
  slug: string;
  category: GameCategory;
  coverImage: string;
  screenshots?: string[];
  entryFile: string;
  status: GameStatus;
  locale: {
    en: { title: string; description: string };
    zh: { title: string; description: string };
  };
}
```

### 4.2 响应统一格式

```typescript
// 成功响应
interface ApiResponse<T> {
  success: true;
  data: T;
}

// 错误响应
interface ApiErrorResponse {
  success: false;
  error: { code: string; message: string };
}
```

## 5. 服务端架构图

```mermaid
flowchart LR
    A["Route Handler"] --> B["Service 层"]
    B --> C["Repository 层<br/>Drizzle"]
    C --> D[("PostgreSQL")]
    B --> E["OSS 层<br/>R2 SDK"]
    E --> F[("Cloudflare R2")]
    B --> G["Zip 处理<br/>fflate"]
```

**分层职责：**
- **Route Handler**：接收请求、参数校验（Zod）、调用 Service、返回响应
- **Service 层**：业务逻辑编排（上传解压、状态流转、统计聚合）
- **Repository 层**：Drizzle ORM 数据访问，隔离 SQL 细节
- **OSS 层**：封装 R2 S3 兼容 SDK，处理上传、删除、签名 URL
- **Zip 层**：使用 fflate 在边缘运行时解压，提取文件清单并检测入口

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    GAME ||--o{ GAME_PLAY_LOG : has
    GAME {
        text id PK
        text slug UK
        text title
        text description
        text category
        text cover_image
        json screenshots
        text entry_file
        text oss_prefix
        text status
        integer play_count
        json locale
        timestamptz created_at
        timestamptz updated_at
    }
    GAME_PLAY_LOG {
        text id PK
        text game_id FK
        text user_ip
        text user_agent
        timestamptz played_at
    }
```

### 6.2 数据定义语言（Drizzle Schema）

```typescript
// src/db/schema.ts
import { pgTable, text, integer, timestamp, json, uuid, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// 游戏表
export const games = pgTable('games', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  category: text('category', { enum: ['action','puzzle','arcade','adventure','strategy','sports','racing','other'] }).notNull().default('other'),
  coverImage: text('cover_image').notNull().default(''),
  screenshots: json('screenshots').$type<string[]>().notNull().default([]),
  entryFile: text('entry_file').notNull().default('index.html'),
  ossPrefix: text('oss_prefix').notNull(),
  status: text('status', { enum: ['draft','published','archived'] }).notNull().default('draft'),
  playCount: integer('play_count').notNull().default(0),
  locale: json('locale').$type<{ en: {title:string; description:string}; zh: {title:string; description:string} }>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  slugIdx: uniqueIndex('games_slug_idx').on(t.slug),
  statusIdx: index('games_status_idx').on(t.status),
  categoryIdx: index('games_category_idx').on(t.category),
}));

// 游戏游玩日志表
export const gamePlayLogs = pgTable('game_play_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  gameId: uuid('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  userIp: text('user_ip').notNull().default(''),
  userAgent: text('user_agent').notNull().default(''),
  playedAt: timestamp('played_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  gameIdx: index('play_logs_game_idx').on(t.gameId),
  playedAtIdx: index('play_logs_played_at_idx').on(t.playedAt),
}));

// Zod Schemas（前后端共享校验）
export const insertGameSchema = createInsertSchema(games);
export const selectGameSchema = createSelectSchema(games);
```

### 6.3 初始化 SQL（迁移由 drizzle-kit 生成）

```sql
-- 启用扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 游戏表
CREATE TABLE IF NOT EXISTS "games" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "category" text NOT NULL DEFAULT 'other',
  "cover_image" text NOT NULL DEFAULT '',
  "screenshots" json NOT NULL DEFAULT '[]',
  "entry_file" text NOT NULL DEFAULT 'index.html',
  "oss_prefix" text NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  "play_count" integer NOT NULL DEFAULT 0,
  "locale" json NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "games_status_idx" ON "games" ("status");
CREATE INDEX IF NOT EXISTS "games_category_idx" ON "games" ("category");

-- 游戏游玩日志表
CREATE TABLE IF NOT EXISTS "game_play_logs" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  "game_id" uuid NOT NULL REFERENCES "games" ("id") ON DELETE CASCADE,
  "user_ip" text NOT NULL DEFAULT '',
  "user_agent" text NOT NULL DEFAULT '',
  "played_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "play_logs_game_idx" ON "game_play_logs" ("game_id");
CREATE INDEX IF NOT EXISTS "play_logs_played_at_idx" ON "game_play_logs" ("played_at");
```

## 7. 项目目录结构

```
mossgap/
├── src/
│   ├── app/
│   │   ├── [locale]/                 # C 端多语言路由
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # 首页
│   │   │   ├── games/
│   │   │   │   ├── page.tsx          # 游戏列表
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx      # 游戏详情
│   │   │   └── play/
│   │   │       └── [slug]/
│   │   │           └── page.tsx      # 游戏游玩（iframe）
│   │   ├── admin/                    # Admin 端（中文）
│   │   │   ├── layout.tsx
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── page.tsx              # 控制台
│   │   │   └── games/
│   │   │       ├── page.tsx          # 游戏列表
│   │   │       ├── new/
│   │   │       │   └── page.tsx      # 上传游戏
│   │   │       └── [id]/
│   │   │           └── page.tsx      # 编辑游戏
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── logout/route.ts
│   │   │   │   ├── upload/route.ts
│   │   │   │   └── games/
│   │   │   │       ├── route.ts
│   │   │   │       └── [id]/route.ts
│   │   │   └── games/
│   │   │       ├── route.ts
│   │   │       └── [slug]/route.ts
│   │   ├── layout.tsx                # 根布局
│   │   ├── globals.css
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── ui/                       # shadcn 组件
│   │   ├── c/                        # C 端业务组件
│   │   │   ├── game-card.tsx
│   │   │   ├── hero-section.tsx
│   │   │   ├── category-nav.tsx
│   │   │   └── game-player.tsx
│   │   └── admin/                    # Admin 业务组件
│   │       ├── sidebar.tsx
│   │       ├── game-table.tsx
│   │       ├── upload-zone.tsx
│   │       └── game-form.tsx
│   ├── db/
│   │   ├── index.ts                  # Drizzle client
│   │   ├── schema.ts                 # Schema 定义
│   │   └── queries.ts                # 查询封装
│   ├── lib/
│   │   ├── oss.ts                    # R2/S3 客户端
│   │   ├── zip.ts                    # Zip 解压
│   │   ├── auth.ts                   # Admin 认证
│   │   ├── utils.ts                  # cn() 等工具
│   │   └── validators.ts             # Zod schemas
│   ├── i18n/
│   │   ├── routing.ts                # next-intl 路由配置
│   │   ├── request.ts                # next-intl 请求配置
│   │   └── navigation.ts             # 包装 Link/useRouter
│   ├── messages/
│   │   ├── en.json
│   │   └── zh.json
│   ├── types/
│   │   └── index.ts
│   ├── middleware.ts                 # next-intl + admin auth 中间件
│   └── env.ts                        # 环境变量校验（Zod）
├── drizzle/                          # 迁移文件
│   └── 0000_initial.sql
├── public/
│   ├── fonts/
│   └── images/
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts                # Tailwind 4 配置（postcss）
├── components.json                   # shadcn 配置
├── wrangler.toml                     # Cloudflare 配置
├── open-next.config.ts               # @opennextjs/cloudflare 配置
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## 8. 部署与配置要点

### 8.1 Cloudflare 部署

- **构建适配器**：`@opennextjs/cloudflare`，将 Next.js 构建产物适配至 Workers/Pages
- **wrangler.toml**：配置 Workers 兼容性标志 `nodejs_compat`，绑定 R2 Bucket、环境变量
- **R2 Bucket**：游戏静态资源存储桶，通过自定义域名或公共开发 URL 提供 iframe 访问
- **构建命令**：`pnpm build` → `opennextjs-cloudflare` 生成 `.open-next/` → `wrangler deploy`

### 8.2 环境变量（.env.example）

```bash
# 数据库
DATABASE_URL=postgres://user:pass@neon.host/db?sslmode=require

# Cloudflare R2（S3 兼容）
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET=mossgap-games
R2_PUBLIC_URL=https://games.mossgap.example.com  # R2 公共访问域名

# Admin 认证
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme
JWT_SECRET=changeme

# 应用
NEXT_PUBLIC_APP_URL=https://mossgap.example.com
```

### 8.3 关键约束

- **运行时兼容性**：Cloudflare Workers 不支持 Node.js 原生模块，所有依赖必须为 Edge 兼容（Zip 解压使用 fflate 纯 JS 实现）
- **请求体大小**：Workers 默认 100MB 请求体限制，大 Zip 包需通过分片或直传 R2 处理
- **CPU 时间**：Workers 免费版 10ms CPU 时间限制，付费版 30s+，需注意解压大包的 CPU 消耗
- **数据库连接**：Neon PostgreSQL 支持 HTTP 驱动（Drizzle 可用），适合 Serverless/Edge 环境
- **Drizzle 迁移**：通过 `drizzle-kit` 在本地或 CI 执行，不依赖运行时迁移能力

## 9. 开发规范

- **类型安全**：所有 API 入参使用 Zod 校验，前后端共享 schema
- **Server Components 优先**：C 端列表/详情默认 RSC，仅在交互处使用 `'use client'`
- **Admin 交互**：表单使用 Server Actions 或 Route Handlers，配合 useFormState
- **i18n 规范**：所有 C 端文案通过 `next-intl` 的 `useTranslations`/`getTranslations` 获取，禁止硬编码
- **OSS 路径约定**：`games/{gameId}/{相对路径}`，入口文件默认 `index.html`
- **错误处理**：API 统一返回 `{ success, data | error }`，前端通过 Toast 反馈
- **代码风格**：Biome（替代 ESLint + Prettier，更快）或 ESLint flat config + Prettier
