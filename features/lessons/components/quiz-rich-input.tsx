"use client";
import { useId, useRef, useState } from "react";
import QuizContent from "./quiz-content";
import ImageField from "@/features/admin/components/image-field";

export default function QuizRichInput({ label, value, onChange, required, maxLength = 10000 }: {
  label: string; value: string; onChange: (text: string) => void; required?: boolean; maxLength?: number;
}) {
  const id = useId();
  const input = useRef<HTMLTextAreaElement>(null);
  const [imageOpen, setImageOpen] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  function insert(before: string, after = "", example = "") {
    const start = input.current?.selectionStart ?? value.length;
    const end = input.current?.selectionEnd ?? start;
    const selected = value.slice(start, end) || example;
    onChange(value.slice(0, start) + before + selected + after + value.slice(end));
    requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(start + before.length, start + before.length + selected.length); });
  }
  return <div className="space-y-2">
    <label htmlFor={id} className="text-xs font-bold text-gray-700">{label}{required && " *"}</label>
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white focus-within:border-bkhn-red">
      <div className="flex flex-wrap gap-1 border-b border-gray-100 bg-gray-50 p-1.5 text-xs font-bold text-gray-600">
        <button type="button" className="rounded px-2 py-1.5 hover:bg-white" onClick={() => insert("**", "**", "in đậm")}>Đậm</button>
        <button type="button" className="rounded px-2 py-1.5 italic hover:bg-white" onClick={() => insert("*", "*", "in nghiêng")}>Nghiêng</button>
        <button type="button" className="rounded px-2 py-1.5 hover:bg-white" onClick={() => insert("$", "$", "x^2")}>Công thức</button>
        <button type="button" className="rounded px-2 py-1.5 hover:bg-white" onClick={() => insert("\n\n| Đại lượng | Giá trị |\n| --- | --- |\n| x | 1 |\n\n")}>Bảng</button>
        <button type="button" aria-expanded={imageOpen} className="rounded px-2 py-1.5 hover:bg-white" onClick={() => setImageOpen(!imageOpen)}>Ảnh</button>
        <button type="button" aria-expanded={preview} className="ml-auto rounded px-2 py-1.5 text-bkhn-red hover:bg-white" onClick={() => setPreview(!preview)}>{preview ? "Ẩn xem trước" : "Xem trước"}</button>
      </div>
      <textarea ref={input} id={id} rows={3} required={required} maxLength={maxLength} value={value} onChange={e => onChange(e.target.value)} className="block w-full resize-y px-3 py-3 text-sm outline-none" placeholder="Nội dung, **in đậm**, $công thức$…" />
    </div>
    {imageOpen && <div className="space-y-2 rounded-xl bg-gray-50 p-3"><ImageField value={image} onChange={setImage} preset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET} /><button type="button" disabled={!image || !/^https?:\/\//i.test(image)} onClick={() => { insert(`\n![Ảnh minh họa](<${image?.replace(/[<>\r\n]/g, "")}>)\n`); setImage(null); setImageOpen(false); }} className="rounded-lg bg-bkhn-red px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Chèn ảnh vào nội dung</button></div>}
    {preview && <div className="rounded-xl border border-bkhn-pink bg-bkhn-pale/40 p-3 text-sm"><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-bkhn-red">Học viên sẽ thấy</p><QuizContent text={value || "Chưa có nội dung."} /></div>}
  </div>;
}
