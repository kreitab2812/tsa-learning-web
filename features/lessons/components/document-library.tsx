"use client";
import { useState } from "react";
import { Download, FileText } from "lucide-react";
import type { LessonAttachmentView } from "../attachments";
import MediaFrame, { type MediaErrorReporter } from "./media-frame";

export default function DocumentLibrary({ files, viewerEmail, accessQuery = "", onReport }: {
  files: LessonAttachmentView[]; viewerEmail: string; accessQuery?: string; onReport?: MediaErrorReporter;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = files.find(file => file.id === selectedId) ?? files.find(file => file.kind === "PDF");
  if (!files.length) return <p className="rounded-2xl border border-dashed border-bkhn-pink bg-white p-8 text-center text-sm text-gray-500">Chưa có tài liệu trong bài học.</p>;
  return <section className="space-y-4" aria-label="Thư viện tài liệu">
    <div className="grid gap-3 sm:grid-cols-2">{files.map(file => <article key={file.id} className={`rounded-2xl border bg-white p-4 ${selected?.id === file.id ? "border-bkhn-red" : "border-gray-200"}`}>
      <p className="flex items-start gap-2 text-sm font-bold text-gray-800"><FileText size={17} className="mt-0.5 shrink-0 text-bkhn-red" />{file.title}</p>
      <p className="mt-2 text-[11px] text-gray-400">{file.kind}{file.sizeBytes ? ` · ${(file.sizeBytes / 1024 / 1024).toFixed(2)} MB` : " · Link có sẵn"} · {file.section === "THEORY" ? "Lý thuyết" : file.section === "PRACTICE" ? "Thực hành" : "Tài liệu"}</p>
      <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-bkhn-red">
        {file.kind === "PDF" && <button type="button" onClick={() => setSelectedId(file.id)} className="min-h-8">Xem PDF</button>}
        {file.allowDownload ? <a href={`/api/learning/attachments/${encodeURIComponent(file.id)}${accessQuery}`} target="_blank" rel="noreferrer" className="flex min-h-8 items-center gap-1"><Download size={13} />Tải xuống</a> : <span className="self-center font-normal text-gray-500">Đã tắt tải trong LMS</span>}
      </div>
      {onReport && <button type="button" onClick={() => onReport("DOCUMENT_LOAD", `Không mở hoặc tải được tài liệu: ${file.title}.`, file.url)} className="mt-2 text-xs font-bold text-red-600">Báo lỗi tài liệu / tải xuống</button>}
      {file.kind !== "PDF" && <p className="mt-2 text-[11px] text-gray-400">Tệp đính kèm, không có trình đọc trong web.</p>}
    </article>)}</div>
    {selected?.kind === "PDF" && <div className="h-[70vh] min-h-[420px]"><MediaFrame key={selected.id} kind="pdf" url={selected.url} title={selected.title} watermark={selected.watermark ? viewerEmail : undefined} onReport={onReport} /></div>}
    <p className="text-[11px] leading-relaxed text-gray-500">Quyền tải trong trình xem Google do chủ tệp cấu hình trên Drive. Watermark chỉ hiển thị trong khung LMS, không thay đổi PDF gốc.</p>
  </section>;
}
