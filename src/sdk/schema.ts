import { z } from "zod";

/**
 * SDK 消息 Schema 模块。
 *
 * 定义平台与游戏 iframe 之间通信的消息格式，使用 Zod 做运行时校验，
 * 非法消息会被 Bridge 直接丢弃，保证平台侧不会被脏数据污染。
 */

/** 消息来源：platform=平台自身，game=游戏 iframe 内 */
export const MessageSourceSchema = z.enum(["platform", "game"]);
export type MessageSource = z.infer<typeof MessageSourceSchema>;

/**
 * 消息类型枚举。
 * 当前 MVP 只实现 analytics + log，后续会扩展 ads/task/achievement/leaderboard/storage。
 */
export const MessageTypeSchema = z.enum([
  "analytics", // 埋点事件
  "log", // 日志
]);
export type MessageType = z.infer<typeof MessageTypeSchema>;

/**
 * Analytics 事件结构（统一埋点格式）。
 * 平台和游戏都使用同一个结构上报埋点。
 */
export const AnalyticsEventSchema = z.object({
  source: MessageSourceSchema,
  event: z.string().min(1),
  payload: z.unknown().optional(),
});
export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

/** 基础消息结构 */
export const BaseMessageSchema = z.object({
  source: MessageSourceSchema,
  type: MessageTypeSchema,
  /** 消息 ID，用于幂等去重 */
  id: z.string().optional(),
  /** 发送时间戳（ms） */
  timestamp: z.number().optional(),
});

/** Analytics 消息 */
export const AnalyticsMessageSchema = BaseMessageSchema.extend({
  type: z.literal("analytics"),
  event: z.string().min(1),
  payload: z.unknown().optional(),
});
export type AnalyticsMessage = z.infer<typeof AnalyticsMessageSchema>;

/** Log 消息 */
export const LogMessageSchema = BaseMessageSchema.extend({
  type: z.literal("log"),
  level: z.enum(["debug", "info", "warn", "error"]),
  message: z.string(),
  data: z.unknown().optional(),
});
export type LogMessage = z.infer<typeof LogMessageSchema>;

/** 所有消息的联合类型（用 discriminatedUnion 按 type 区分） */
export const MessageSchema = z.discriminatedUnion("type", [
  AnalyticsMessageSchema,
  LogMessageSchema,
]);
export type Message = AnalyticsMessage | LogMessage;
