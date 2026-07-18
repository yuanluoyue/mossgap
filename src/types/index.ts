/** 游戏角标（首页/卡片角标，可多选） */
export type GameBadge = "new" | "hot";

/** 全部游戏角标（用于后台多选与校验） */
export const GAME_BADGES: GameBadge[] = ["new", "hot"];

/** 角标展示文案（B 端中文） */
export const GAME_BADGE_LABELS: Record<GameBadge, string> = {
  new: "NEW",
  hot: "HOT",
};

/**
 * 角标展示样式（B 端 + C 端统一）。
 * hot: 红色系；new: 绿色系。
 */
export const GAME_BADGE_STYLES: Record<GameBadge, string> = {
  hot: "bg-red-500 text-white",
  new: "bg-emerald-500 text-white",
};

/** 游戏状态 */
export type GameStatus = "draft" | "published" | "archived";

/** 游戏分类 */
export type GameCategory =
  | "action"
  | "puzzle"
  | "arcade"
  | "adventure"
  | "strategy"
  | "sports"
  | "racing"
  | "other";

export const GAME_CATEGORIES: GameCategory[] = [
  "action",
  "puzzle",
  "arcade",
  "adventure",
  "strategy",
  "sports",
  "racing",
  "other",
];

export const GAME_STATUSES: GameStatus[] = ["draft", "published", "archived"];

/** 游戏来源类型：zip 上传包 / iframe 外链 */
export type GameSourceType = "zip" | "iframe";

/** 多语言游戏元信息 */
export interface GameLocale {
  en: { title: string; description: string };
  zh: { title: string; description: string };
}

/** 玩法说明（按语言） */
export interface HowToPlay {
  en: string;
  zh: string;
}

/** 分类配色（Poki 风格：每个分类一种彩色 accent） */
export const CATEGORY_COLORS: Record<GameCategory, string> = {
  action: "#ef4444",
  puzzle: "#8b5cf6",
  arcade: "#14b8a6",
  adventure: "#f59e0b",
  strategy: "#6366f1",
  sports: "#10b981",
  racing: "#06b6d4",
  other: "#64748b",
};

// ─── 内容组织：分类 / 标签 / 专题 ───────────────────────────────

/** 多语言元信息（分类/标签/专题通用） */
export interface TaxonomyLocale {
  en: { name: string; description: string; seoTitle: string; seoDescription: string };
  zh: { name: string; description: string; seoTitle: string; seoDescription: string };
}

/** 专题布局类型 */
export type CollectionLayout = "grid" | "list" | "carousel" | "hero";

export const COLLECTION_LAYOUTS: CollectionLayout[] = ["grid", "list", "carousel", "hero"];

/** Admin 端分类数据（完整） */
export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  locale: TaxonomyLocale;
  icon: string;
  coverImage: string;
  color: string;
  sortOrder: number;
  isVisible: boolean;
  gameCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Admin 端标签数据（完整） */
export interface AdminTag {
  id: string;
  slug: string;
  name: string;
  locale: TaxonomyLocale;
  icon: string;
  color: string;
  sortOrder: number;
  isVisible: boolean;
  gameCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Admin 端专题数据（完整） */
export interface AdminCollection {
  id: string;
  slug: string;
  name: string;
  locale: TaxonomyLocale;
  icon: string;
  coverImage: string;
  layout: CollectionLayout;
  sortOrder: number;
  isVisible: boolean;
  gameCount: number;
  createdAt: string;
  updatedAt: string;
}

/** C 端公开分类数据（已按 locale 解析） */
export interface PublicCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  icon: string;
  coverImage: string;
  color: string;
  gameCount: number;
}

/** C 端公开标签数据（已按 locale 解析） */
export interface PublicTag {
  id: string;
  slug: string;
  name: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  icon: string;
  color: string;
  gameCount: number;
}

/** C 端公开专题数据（已按 locale 解析） */
export interface PublicCollection {
  id: string;
  slug: string;
  name: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  icon: string;
  coverImage: string;
  layout: CollectionLayout;
  gameCount: number;
}

/** C 端公开游戏数据（已按 locale 解析） */
export interface PublicGame {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: GameCategory;
  coverImage: string;
  screenshots: string[];
  playCount: number;
  likeCount: number;
  dislikeCount: number;
  createdAt: string;
  playUrl: string;
  sourceType: GameSourceType;
  iframeUrl: string;
  howToPlay: string;
  /** 角标（C 端卡片可展示） */
  badge: GameBadge[];
  /** 发布时间（ISO 字符串，未发布为空字符串） */
  publishedAt: string;
}

/** 首页/列表卡片轻量数据（只含渲染卡片必需字段） */
export interface GameCardItem {
  id: string;
  slug: string;
  title: string;
  coverImage: string;
  /** 角标（C 端卡片右上角展示） */
  badge: GameBadge[];
}

/** Admin 端游戏数据（完整） */
export interface AdminGame {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: GameCategory;
  coverImage: string;
  screenshots: string[];
  entryFile: string;
  ossPrefix: string;
  status: GameStatus;
  playCount: number;
  likeCount: number;
  dislikeCount: number;
  locale: GameLocale;
  sourceType: GameSourceType;
  iframeUrl: string;
  howToPlay: HowToPlay;
  relatedGameIds: string[];
  ossSize: number;
  /** 内部备注（仅 B 端展示） */
  internalNotes: string;
  featured: boolean;
  categoryId: string | null;
  uploaderId: string | null;
  uploaderName: string | null;
  tagIds: string[];
  collectionIds: string[];
  /** 角标（B 端可编辑，C 端可展示） */
  badge: GameBadge[];
  /** 排序权重（数值越大越靠前，B 端可编辑） */
  weight: number;
  /** 发布时间（ISO 字符串，未发布为空字符串） */
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

/** 上传 Zip 解压后响应 */
export interface UploadGameResponse {
  id: string;
  ossPrefix: string;
  detectedEntry: string | null;
  files: { path: string; size: number }[];
  totalSize: number;
}

/** 反馈类型 */
export type FeedbackType = "game" | "platform";

/** 反馈处理状态 */
export type FeedbackStatus = "pending" | "resolved";

/** 后台反馈列表项 */
export interface AdminFeedback {
  id: string;
  type: FeedbackType;
  gameId: string;
  contact: string;
  content: string;
  status: FeedbackStatus;
  /** 关联游戏标题（如有） */
  gameTitle?: string;
  createdAt: string;
}

/** 统一 API 响应 */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function fail(code: string, message: string): ApiResponse<never> {
  return { success: false, error: { code, message } };
}
