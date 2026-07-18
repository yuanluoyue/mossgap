"use client";

import { useEffect, useRef, useState } from "react";
import {
  useEditor,
  EditorContent,
  Extension,
  Mark,
  mergeAttributes,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Palette,
  Redo,
  Strikethrough,
  Type,
  Undo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** 最小高度（默认 240px） */
  minHeight?: number;
}

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"];
const COLORS = [
  "#111827",
  "#6b7280",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#2563eb",
  "#7c3aed",
];

/** 自定义内联样式 Mark：color / fontSize */
const InlineStyle = Mark.create({
  name: "inlineStyle",
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => element.style.color || null,
        renderHTML: (attributes) =>
          attributes.color ? { style: `color: ${attributes.color}` } : {},
      },
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: (attributes) =>
          attributes.fontSize
            ? { style: `font-size: ${attributes.fontSize}` }
            : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[style]" }];
  },
  renderHTML({ HTMLAttributes }) {
    const style = [
      HTMLAttributes.style,
      HTMLAttributes.color ? `color: ${HTMLAttributes.color}` : null,
      HTMLAttributes.fontSize ? `font-size: ${HTMLAttributes.fontSize}` : null,
    ]
      .filter(Boolean)
      .join("; ");
    return ["span", mergeAttributes(HTMLAttributes, style ? { style } : {}), 0];
  },
});

/** 文本对齐扩展（应用到 heading / paragraph） */
const TextAlign = Extension.create({
  name: "textAlign",
  addGlobalAttributes() {
    return [
      {
        types: ["heading", "paragraph"],
        attributes: {
          textAlign: {
            default: null,
            parseHTML: (element) => element.style.textAlign || null,
            renderHTML: (attributes) =>
              attributes.textAlign
                ? { style: `text-align: ${attributes.textAlign}` }
                : {},
          },
        },
      },
    ];
  },
});

export function RichTextEditor({
  content,
  onChange,
  placeholder = "开始输入内容...",
  minHeight = 240,
}: RichTextEditorProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: false,
      }),
      InlineStyle,
      TextAlign,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline" },
      }),
      Image.configure({
        inline: true,
        HTMLAttributes: { class: "rounded-lg" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    editorProps: {
      attributes: {
        class: "rich-text-editor-content",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // 外部 content 变化时同步到编辑器（避免循环：只在 content !== editor HTML 时才设置）
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  const toolbarButtons = [
    {
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive("bold"),
      title: "加粗",
    },
    {
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive("italic"),
      title: "斜体",
    },
    {
      icon: Strikethrough,
      action: () => editor.chain().focus().toggleStrike().run(),
      active: editor.isActive("strike"),
      title: "删除线",
    },
    {
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive("heading", { level: 2 }),
      title: "标题 2",
    },
    {
      icon: Heading3,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: editor.isActive("heading", { level: 3 }),
      title: "标题 3",
    },
    {
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive("bulletList"),
      title: "无序列表",
    },
    {
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive("orderedList"),
      title: "有序列表",
    },
    {
      icon: LinkIcon,
      action: () => {
        const url = window.prompt("请输入链接地址：");
        if (url) editor.chain().focus().setLink({ href: url }).run();
      },
      active: editor.isActive("link"),
      title: "插入链接",
    },
    {
      icon: ImagePlus,
      action: () => fileInputRef.current?.click(),
      active: false,
      title: "插入图片",
      loading: uploading,
    },
    {
      icon: Undo,
      action: () => editor.chain().focus().undo().run(),
      active: false,
      title: "撤销",
    },
    {
      icon: Redo,
      action: () => editor.chain().focus().redo().run(),
      active: false,
      title: "重做",
    },
  ];

  const currentColor = editor.getAttributes("inlineStyle").color || "#111827";
  const currentFontSize =
    editor.getAttributes("inlineStyle").fontSize || "default";
  const currentTextAlign = editor.isActive("heading")
    ? editor.getAttributes("heading").textAlign || "left"
    : editor.getAttributes("paragraph").textAlign || "left";
  const setTextAlign = (textAlign: "left" | "center" | "right") => {
    const nodeType = editor.isActive("heading") ? "heading" : "paragraph";
    editor.chain().focus().updateAttributes(nodeType, { textAlign }).run();
  };

  return (
    <div className="flex h-full flex-col rounded-md border">
      <div className="flex flex-wrap gap-1 border-b bg-muted/50 p-2 shrink-0">
        {/* eslint-disable react-hooks/refs */}
        {toolbarButtons.map((btn, i) => (
          <Button
            key={i}
            type="button"
            variant={btn.active ? "default" : "ghost"}
            size="sm"
            className="size-8 p-0"
            onClick={btn.action}
            title={btn.title}
            disabled={btn.loading}
          >
            {btn.loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <btn.icon className="size-4" />
            )}
          </Button>
        ))}
        <div className="mx-1 h-8 w-px bg-border" />
        <Button
          type="button"
          variant={currentTextAlign === "left" ? "default" : "ghost"}
          size="sm"
          className="size-8 p-0"
          onClick={() => setTextAlign("left")}
          title="左对齐"
        >
          <AlignLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant={currentTextAlign === "center" ? "default" : "ghost"}
          size="sm"
          className="size-8 p-0"
          onClick={() => setTextAlign("center")}
          title="居中对齐"
        >
          <AlignCenter className="size-4" />
        </Button>
        <Button
          type="button"
          variant={currentTextAlign === "right" ? "default" : "ghost"}
          size="sm"
          className="size-8 p-0"
          onClick={() => setTextAlign("right")}
          title="右对齐"
        >
          <AlignRight className="size-4" />
        </Button>
        <div className="mx-1 h-8 w-px bg-border" />
        <Select
          value={currentFontSize}
          onValueChange={(value) => {
            if (value === "default") {
              editor.chain().focus().setMark("inlineStyle", { fontSize: null }).run();
            } else {
              editor.chain().focus().setMark("inlineStyle", { fontSize: value }).run();
            }
          }}
        >
          <SelectTrigger className="h-8 w-28 gap-1">
            <Type className="size-4" />
            <SelectValue placeholder="字号" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">默认</SelectItem>
            {FONT_SIZES.map((size) => (
              <SelectItem key={size} value={size}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex h-8 items-center gap-1 rounded-md border bg-background px-2">
          <Palette className="size-4 text-muted-foreground" />
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`size-5 rounded-full border ${currentColor === color ? "ring-2 ring-primary ring-offset-1" : ""}`}
              style={{ backgroundColor: color }}
              onClick={() =>
                editor.chain().focus().setMark("inlineStyle", { color }).run()
              }
              title={`颜色 ${color}`}
            />
          ))}
          <Input
            type="color"
            value={currentColor}
            className="h-6 w-7 cursor-pointer border-0 bg-transparent p-0"
            onChange={(e) =>
              editor
                .chain()
                .focus()
                .setMark("inlineStyle", { color: e.target.value })
                .run()
            }
            title="自定义颜色"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() =>
            editor.chain().focus().setMark("inlineStyle", { color: null }).run()
          }
          title="清除颜色"
        >
          清除
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={async (e) => {
            const files = Array.from(e.target.files || []);
            if (files.length === 0) return;
            setUploading(true);
            try {
              const urls: string[] = [];
              for (const file of files) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("category", "editor");
                const res = await fetch("/api/admin/upload-image", {
                  method: "POST",
                  body: formData,
                });
                if (!res.ok) throw new Error("上传失败");
                // mossgap 的 ok() 响应结构：{success: true, data: {url}}
                const data = (await res.json()) as {
                  success?: boolean;
                  data?: { url?: string };
                };
                const url = data?.data?.url;
                if (url) urls.push(url);
              }
              if (urls.length === 0) return;
              if (urls.length === 1) {
                editor.chain().focus().setImage({ src: urls[0] }).run();
              } else {
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: "paragraph",
                    content: urls.map((url) => ({
                      type: "image",
                      attrs: { src: url },
                    })),
                  })
                  .run();
              }
            } catch (err) {
              console.error("图片上传失败:", err);
            } finally {
              setUploading(false);
              e.target.value = "";
            }
          }}
        />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <style jsx global>{`
          .rich-text-editor-content {
            min-height: ${minHeight}px;
            outline: none;
            line-height: 1.6;
          }
          .rich-text-editor-content p {
            margin: 0.5rem 0;
          }
          .rich-text-editor-content h2 {
            display: block;
            font-size: 1.375rem;
            font-weight: 700;
            line-height: 1.3;
            margin: 1rem 0 0.5rem;
          }
          .rich-text-editor-content h3 {
            display: block;
            font-size: 1.125rem;
            font-weight: 600;
            line-height: 1.4;
            margin: 0.75rem 0 0.375rem;
          }
          .rich-text-editor-content strong,
          .rich-text-editor-content b {
            font-weight: 700;
          }
          .rich-text-editor-content em,
          .rich-text-editor-content i {
            font-style: italic;
          }
          .rich-text-editor-content s,
          .rich-text-editor-content strike {
            text-decoration: line-through;
          }
          .rich-text-editor-content ul {
            list-style-type: disc;
            margin: 0.5rem 0;
            padding-left: 1.5rem;
          }
          .rich-text-editor-content ol {
            list-style-type: decimal;
            margin: 0.5rem 0;
            padding-left: 1.5rem;
          }
          .rich-text-editor-content li {
            display: list-item;
            margin: 0.25rem 0;
          }
          .rich-text-editor-content li p {
            margin: 0;
          }
          .rich-text-editor-content blockquote {
            border-left: 3px solid var(--color-border);
            color: var(--color-muted-foreground);
            font-style: italic;
            margin: 0.75rem 0;
            padding-left: 1rem;
          }
          .rich-text-editor-content a {
            color: var(--color-primary);
            cursor: pointer;
            text-decoration: underline;
          }
          .rich-text-editor-content hr {
            border: 0;
            border-top: 2px solid var(--color-border);
            margin: 1rem 0;
          }
          .rich-text-editor-content img {
            border-radius: 0.5rem;
            height: auto;
            max-width: 100%;
          }
          .rich-text-editor-content p:has(img) {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            align-items: center;
          }
          .rich-text-editor-content p:has(img) img {
            flex: 1 1 0%;
            min-width: 0;
            margin: 0;
            object-fit: contain;
          }
          .rich-text-editor-content p.is-editor-empty:first-child::before {
            color: var(--color-muted-foreground);
            content: attr(data-placeholder);
            float: left;
            height: 0;
            pointer-events: none;
          }
        `}</style>
        <EditorContent editor={editor} className="max-w-none p-3" />
      </div>
    </div>
  );
}
