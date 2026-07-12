import {
  MessageSchema,
  type Message,
  type AnalyticsMessage,
  type LogMessage,
} from "./schema";
import { dispatcher } from "./dispatcher";
import { logger } from "./logger";

/**
 * SDK Bridge 模块。
 *
 * 负责平台与游戏 iframe 之间的通信：
 * - 平台端（父窗口）：调用 `bridge.listen()` 监听 iframe 发来的 message
 * - 游戏端（iframe 内）：调用 `bridge.send()` 向父窗口发消息
 *
 * 安全：
 * 1. 校验 origin 是否在受信任列表中（本地开发自动允许 localhost）
 * 2. 消息体必须符合 Schema，非法消息直接丢弃
 */

export class Bridge {
  private listening = false;
  private trustedOrigins: string[] = [];

  /** 设置受信任的 origin（游戏 iframe 的 origin） */
  setTrustedOrigins(origins: string[]): void {
    this.trustedOrigins = origins;
  }

  private isTrusted(origin: string): boolean {
    // 本地开发允许 localhost / 127.0.0.1
    if (
      origin.startsWith("http://localhost") ||
      origin.startsWith("http://127.0.0.1")
    ) {
      return true;
    }
    return this.trustedOrigins.includes(origin);
  }

  /**
   * 平台端：监听来自 iframe 的 message。
   * 校验后通过 dispatcher 发射对应事件，返回取消监听函数。
   */
  listen(): () => void {
    if (this.listening) {
      logger.warn("[Bridge] already listening");
      return () => {};
    }
    this.listening = true;

    const handler = (e: MessageEvent) => {
      if (!e.source || !this.isTrusted(e.origin)) return;

      const result = MessageSchema.safeParse(e.data);
      if (!result.success) {
        logger.debug("[Bridge] invalid message, dropped", result.error.issues);
        return;
      }

      const msg = result.data;
      logger.debug("[Bridge] message received", msg);

      switch (msg.type) {
        case "analytics":
          dispatcher.emit("analytics", msg as AnalyticsMessage);
          break;
        case "log":
          dispatcher.emit("log", msg as LogMessage);
          break;
      }
    };

    window.addEventListener("message", handler);

    return () => {
      window.removeEventListener("message", handler);
      this.listening = false;
    };
  }

  /**
   * 游戏端：向父窗口发送消息。
   * 平台端不会用这个方法，但 SDK 作为统一通信层提供此能力。
   */
  send(message: Message): void {
    if (typeof window === "undefined" || !window.parent) {
      logger.warn("[Bridge] no parent window");
      return;
    }
    // 生产环境应指定 targetOrigin，这里用 "*" 保证兼容性
    // 游戏方接入时可以根据实际平台域名替换
    window.parent.postMessage(message, "*");
  }
}

/** 默认 Bridge 实例 */
export const bridge = new Bridge();
