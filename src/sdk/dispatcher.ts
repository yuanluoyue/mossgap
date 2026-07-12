/**
 * SDK Dispatcher 模块。
 *
 * 轻量级 event bus，支持 on/off/emit 和通配符 "*"。
 * Bridge 收到合法消息后通过 dispatcher.emit 分发给各模块。
 */

type EventHandler<T = unknown> = (payload: T) => void;

export class Dispatcher {
  private handlers = new Map<string, Set<EventHandler>>();

  /** 订阅事件，返回取消订阅函数 */
  on(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  /** 取消订阅 */
  off(event: string, handler: EventHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  /** 发射事件，通配符 "*" 监听器会收到 { event, payload } */
  emit(event: string, payload?: unknown): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(payload);
        } catch (err) {
          // 不能让一个 handler 的错误影响其他 handler
          // eslint-disable-next-line no-console
          console.error("[Dispatcher] handler error:", err);
        }
      });
    }
    const wildcardHandlers = this.handlers.get("*");
    if (wildcardHandlers) {
      wildcardHandlers.forEach((h) => {
        try {
          h({ event, payload });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("[Dispatcher] wildcard handler error:", err);
        }
      });
    }
  }

  /** 清空所有订阅 */
  clear(): void {
    this.handlers.clear();
  }
}

/** 默认 Dispatcher 实例 */
export const dispatcher = new Dispatcher();
