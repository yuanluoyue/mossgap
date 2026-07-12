/**
 * SDK Logger 模块。
 *
 * 统一的 console 日志工具，带前缀和级别过滤。
 * 游戏通过 Bridge 发来的 log 消息也会走这个 Logger 输出。
 */

type LogLevel = "debug" | "info" | "warn" | "error";
export type { LogLevel };

interface LoggerOptions {
  /** 日志前缀，默认 "[MossGap]" */
  prefix?: string;
  /** 最低输出级别，默认 "info" */
  level?: LogLevel;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export class Logger {
  private prefix: string;
  private level: LogLevel;

  constructor(opts: LoggerOptions = {}) {
    this.prefix = opts.prefix ?? "[MossGap]";
    this.level = opts.level ?? "info";
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.level];
  }

  private format(level: LogLevel, message: string): string {
    return `${this.prefix}[${level.toUpperCase()}] ${message}`;
  }

  debug(message: string, data?: unknown): void {
    if (!this.shouldLog("debug")) return;
    console.debug(this.format("debug", message), data ?? "");
  }

  info(message: string, data?: unknown): void {
    if (!this.shouldLog("info")) return;
    console.info(this.format("info", message), data ?? "");
  }

  warn(message: string, data?: unknown): void {
    if (!this.shouldLog("warn")) return;
    console.warn(this.format("warn", message), data ?? "");
  }

  error(message: string, data?: unknown): void {
    if (!this.shouldLog("error")) return;
    console.error(this.format("error", message), data ?? "");
  }
}

/** 默认 Logger 实例 */
export const logger = new Logger();
