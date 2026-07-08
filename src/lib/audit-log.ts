import { getAuthPayload } from "@/lib/auth";
import { getClientIp, getClientUserAgent } from "@/lib/api-guard";
import { writeOperationLog } from "@/db/queries";

/**
 * 写入操作日志（自动填充操作人、IP、UA）。
 *
 * 用于 RBAC 各模块的增删改操作留痕。日志写入失败不会影响主流程。
 */
export async function createAuditLog(input: {
  action: string;
  resource: string;
  targetId?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    const [payload, ip, ua] = await Promise.all([
      getAuthPayload(),
      getClientIp(),
      getClientUserAgent(),
    ]);
    await writeOperationLog({
      action: input.action,
      resource: input.resource,
      targetType: input.resource,
      targetId: input.targetId,
      meta: input.meta,
      operatorIp: ip,
      operatorUseragent: ua,
      operatorId: payload?.sub,
      operatorUsername: payload?.username,
    });
  } catch (err) {
    // 日志失败不阻塞业务
    console.error("[audit-log] 写入失败", err);
  }
}
