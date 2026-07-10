/**
 * OSS 适配器接口。
 *
 * 适配器只负责底层 S3 操作，不处理 key 前缀逻辑。
 * 调用方传入的 key 应为完整 key（已包含 S3_KEY_PREFIX）。
 */
export interface OssAdapter {
  /** 上传单个对象 */
  putObject(
    key: string,
    body: Uint8Array | string,
    contentType: string,
  ): Promise<void>;

  /** 删除单个对象（对象不存在时静默成功） */
  deleteObject(key: string): Promise<void>;

  /** 批量删除多个对象 */
  deleteObjects(keys: string[]): Promise<void>;

  /** 列出某前缀下所有对象，返回完整 key 与 size */
  listObjects(
    prefix: string,
  ): Promise<{ key: string; size: number }[]>;
}
