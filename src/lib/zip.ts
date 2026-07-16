import { unzipSync } from "fflate";

export interface ExtractedFile {
  path: string;
  data: Uint8Array;
  size: number;
}

export interface ExtractResult {
  files: ExtractedFile[];
  detectedEntry: string | null;
}

/**
 * 解压 Zip 二进制数据（纯 JS，兼容 Cloudflare Workers 运行时）。
 * 使用同步 API，因为 fflate 的异步 unzip 依赖 worker 线程，
 * 而 Cloudflare Workers 运行时不支持 worker_threads / Web Workers。
 * 自动规范化路径（去除首层目录、过滤隐藏/系统文件）并检测入口 HTML。
 */
export async function extractZip(data: Uint8Array): Promise<ExtractResult> {
  const entries = unzipSync(data);

  const files: ExtractedFile[] = [];
  const rawPaths = Object.keys(entries);

  // 检测是否存在公共父目录（如 mygame/index.html），以便剥除
  const topFolders = new Set<string>();
  for (const p of rawPaths) {
    if (p.endsWith("/")) continue;
    const firstSeg = p.split("/")[0];
    if (p.includes("/")) topFolders.add(firstSeg);
  }
  const singleTopFolder =
    topFolders.size === 1 && rawPaths.every((p) => p.startsWith(`${[...topFolders][0]}/`));

  for (const p of rawPaths) {
    if (p.endsWith("/")) continue;
    // 过滤 macOS / Windows 系统文件
    if (/(^|\/)(__MACOSX\/|\.DS_Store$|Thumbs\.db$)/.test(p)) continue;
    const normalized = singleTopFolder ? p.slice(p.indexOf("/") + 1) : p;
    if (!normalized) continue;
    const data = entries[p];
    files.push({ path: normalized, data, size: data.length });
  }

  files.sort((a, b) => a.path.localeCompare(b.path));

  return {
    files,
    detectedEntry: detectEntry(files.map((f) => f.path)),
  };
}

/** 检测游戏入口 HTML 文件，优先级：根目录 index.html > 任意 index.html > 任意 .html。 */
export function detectEntry(paths: string[]): string | null {
  const rootIndex = paths.find((p) => p === "index.html" || p === "index.htm");
  if (rootIndex) return rootIndex;
  const anyIndex = paths.find((p) => /(^|\/)index\.html?$/.test(p));
  if (anyIndex) return anyIndex;
  const anyHtml = paths.find((p) => p.endsWith(".html") || p.endsWith(".htm"));
  return anyHtml ?? null;
}
