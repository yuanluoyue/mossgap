"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { FileDropzone } from "@/components/ui/file-dropzone";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  /** 资源类型：封面图 / 截图 */
  category: "cover" | "screenshot";
  /** 当前图片 URL（已有或刚上传的） */
  url: string;
  /** URL 变化回调 */
  onUrlChange: (url: string) => void;
  /** 上传成功后是否删除旧图（替换模式） */
  replaceOldUrl?: boolean;
  className?: string;
}

/**
 * 图片上传组件：封装 FileDropzone + 上传到 OSS 逻辑。
 * - 选择文件后自动上传到 /api/admin/upload-image
 * - 上传成功后回调 onUrlChange 传入新 URL
 * - 支持显示已有 URL 的预览
 */
export function ImageUploader({
  category,
  url,
  onUrlChange,
  replaceOldUrl = true,
  className,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(file: File | null) {
    if (!file) {
      // 删除：清空 URL
      onUrlChange("");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", category);
      if (replaceOldUrl && url) {
        fd.append("replaceUrl", url);
      }
      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as {
        success?: boolean;
        data?: { url?: string };
        error?: { message?: string };
      };
      if (!res.ok || !data.success || !data.data?.url) {
        toast.error(data?.error?.message ?? "上传失败");
        return;
      }
      onUrlChange(data.data.url);
      toast.success("上传成功");
    } catch {
      toast.error("网络错误");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <FileDropzone
        preview={url || undefined}
        onFileChange={handleFileChange}
      />
      {uploading ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/60">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : null}
    </div>
  );
}
