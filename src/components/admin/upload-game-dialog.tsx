"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileArchive,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { UploadGameResponse } from "@/types";

interface UploadGameDialogProps {
  children: React.ReactNode;
}

/**
 * 上传游戏弹窗
 * - 拖拽/选择 zip 文件
 * - 上传到 /api/admin/upload
 * - 上传成功后跳转到编辑页配置游戏信息
 */
export function UploadGameDialog({ children }: UploadGameDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, []);

  function handleFile(f: File) {
    if (!f.name.toLowerCase().endsWith(".zip")) {
      toast.error("请上传 .zip 文件");
      return;
    }
    if (f.size > 200 * 1024 * 1024) {
      toast.error("文件大小不能超过 200MB");
      return;
    }
    setFile(f);
  }

  function reset() {
    setFile(null);
    setProgress(0);
    setUploading(false);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // 关闭时重置状态（但不在上传中）
      if (!uploading) reset();
    }
  }

  async function onUpload() {
    if (!file || uploading) return;
    setUploading(true);
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append("file", file);

      // 使用 XHR 以便显示进度
      const res = await new Promise<{
        ok: boolean;
        data: UploadGameResponse | null;
        error?: string;
      }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/admin/upload");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300 && json.success) {
              resolve({ ok: true, data: json.data });
            } else {
              resolve({
                ok: false,
                data: null,
                error: json?.error?.message ?? "上传失败",
              });
            }
          } catch {
            reject(new Error("响应解析失败"));
          }
        };
        xhr.onerror = () => reject(new Error("网络错误"));
        xhr.send(formData);
      });

      if (!res.ok || !res.data) {
        toast.error(res.error ?? "上传失败");
        return;
      }

      toast.success(
        `上传成功！检测到入口：${res.data.detectedEntry ?? "未检测到"}`,
      );
      setOpen(false);
      reset();
      // 跳转到编辑页配置游戏信息
      router.push(`/admin/games/${res.data.id}/edit`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message ?? "上传失败");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>上传游戏</DialogTitle>
          <DialogDescription>
            上传 zip 游戏包，系统将自动解压并上传到 OSS，随后跳转到配置页面
          </DialogDescription>
        </DialogHeader>

        {/* 拖拽区 */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/30"
          }`}
        >
          {file ? (
            <div className="flex w-full items-center gap-3 rounded-lg border bg-background p-4">
              <FileArchive className="size-8 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              {!uploading ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  type="button"
                  onClick={() => setFile(null)}
                >
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <UploadCloud className="size-12 text-muted-foreground/50" />
              <div className="text-center">
                <p className="text-sm font-medium">拖拽 zip 文件到此处</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  或点击下方按钮选择文件
                </p>
              </div>
              <label>
                <input
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                <Button variant="secondary" type="button" asChild>
                  <span>选择文件</span>
                </Button>
              </label>
            </>
          )}
        </div>

        {/* 进度条 */}
        {uploading ? (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="size-3 animate-spin" />
                正在上传...
              </span>
              <span className="tabular-nums">{progress}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}

        {/* 上传须知 */}
        <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-green-600" />
            仅支持 .zip 格式，文件大小不超过 200MB
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-green-600" />
            zip 包内应包含 index.html 作为游戏入口
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-green-600" />
            如 zip 包有单层公共父目录，系统会自动剥除
          </p>
        </div>

        {/* 操作 */}
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            type="button"
            onClick={() => setOpen(false)}
            disabled={uploading}
          >
            取消
          </Button>
          <Button onClick={onUpload} disabled={!file || uploading}>
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UploadCloud className="size-4" />
            )}
            {uploading ? "上传中..." : "开始上传"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
