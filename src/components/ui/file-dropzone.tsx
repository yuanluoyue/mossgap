"use client"

import { useCallback, useRef, useState } from "react"
import { Upload, X, Image as ImageIcon } from "lucide-react"

interface FileDropzoneProps {
  accept?: string
  file?: File | null
  onFileChange?: (file: File | null) => void
  preview?: string
}

export function FileDropzone({ accept = "image/*", file, onFileChange, preview }: FileDropzoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) onFileChange?.(dropped)
  }, [onFileChange])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) onFileChange?.(selected)
  }, [onFileChange])

  const handleRemove = useCallback(() => {
    onFileChange?.(null)
    if (inputRef.current) inputRef.current.value = ""
  }, [onFileChange])

  const previewUrl = file ? URL.createObjectURL(file) : preview

  return (
    <div
      className={`relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
        dragging
          ? "border-primary bg-primary/5"
          : previewUrl
            ? "border-border bg-muted/30"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
      />

      {previewUrl ? (
        <>
          <img
            src={previewUrl}
            alt="Preview"
            className="max-h-36 rounded-md object-contain"
          />
          <button
            type="button"
            className="absolute right-2 top-2 rounded-full bg-background/80 p-1 shadow-sm transition-colors hover:bg-destructive hover:text-destructive-foreground"
            onClick={(e) => { e.stopPropagation(); handleRemove() }}
          >
            <X className="size-4" />
          </button>
        </>
      ) : (
        <>
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Upload className="size-5 text-muted-foreground" />
          </div>
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            Drag & drop or <span className="text-primary underline underline-offset-4">click to upload</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Supports JPG, PNG, GIF, WebP
          </p>
        </>
      )}
    </div>
  )
}
