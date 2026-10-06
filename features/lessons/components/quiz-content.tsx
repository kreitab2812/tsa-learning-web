"use client";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import "katex/contrib/mhchem";
import ContentImage from "@/features/admin/components/content-image";

/** One renderer for editing, import review, Preview and real learning. No raw HTML. */
export default function QuizContent({ text }: { text?: string | null }) {
  if (!text) return null;
  return <div className="min-w-0 break-words leading-relaxed [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_.katex-display]:overflow-x-auto">
    <Markdown skipHtml remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, { trust: false, strict: "ignore", maxExpand: 1000 }]]}
      urlTransform={url => /^https?:\/\//i.test(url) ? url : ""}
      components={{
        img: ({ src, alt }) => typeof src === "string" && src ? <ContentImage src={src} alt={alt || "Ảnh câu hỏi"} className="my-2 max-h-80 max-w-full rounded-lg object-contain" /> : <span className="text-red-600">[URL ảnh không hợp lệ]</span>,
        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-bkhn-red underline">{children}</a>,
        table: ({ children }) => <div className="my-3 overflow-x-auto"><table className="w-full border-collapse text-sm">{children}</table></div>,
        th: ({ children }) => <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left">{children}</th>,
        td: ({ children }) => <td className="border border-gray-200 px-3 py-2">{children}</td>,
      }}>{text}</Markdown>
  </div>;
}
