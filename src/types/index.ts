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

/** 多语言游戏元信息 */
export interface GameLocale {
  en: { title: string; description: string };
  zh: { title: string; description: string };
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
  createdAt: string;
  playUrl: string;
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
  locale: GameLocale;
  createdAt: string;
  updatedAt: string;
}

/** 上传 Zip 解压后响应 */
export interface UploadGameResponse {
  id: string;
  ossPrefix: string;
  detectedEntry: string | null;
  files: { path: string; size: number }[];
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
