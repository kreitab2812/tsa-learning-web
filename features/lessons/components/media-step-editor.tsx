"use client";
import type { useLessonWorkspace } from "../hooks/use-lesson-workspace";
import LessonMediaView from "./lesson-media-view";

export default function MediaStepEditor({ workspace: w, step }: { workspace: ReturnType<typeof useLessonWorkspace>; step: "theory" | "practice" }) {
  if (!w.values || !w.lesson) return null;
  const videoKey = step === "theory" ? "videoTheoryUrl" : "videoPracticeUrl";
  const pdfKey = step === "theory" ? "theoryDocumentUrl" : "practiceDocumentUrl";
  const splitKey = step === "theory" ? "theorySplitView" : "practiceSplitView";
  const title = step === "theory" ? "Lý thuyết" : "Thực hành";
  const values = w.values;
  const file = w.lesson.attachments?.find(item => item.sourceKey === pdfKey && item.url === values[pdfKey]);
  return <div className="space-y-5">
    <div className="space-y-4 rounded-2xl border border-bkhn-pink bg-white p-5">
      <div className="grid gap-4 xl:grid-cols-2">{([{ key: videoKey, label: "Video YouTube", placeholder: "https://youtube.com/watch?v=..." }, { key: pdfKey, label: "PDF Google Drive đi kèm", placeholder: "https://drive.google.com/file/d/.../view" }] as const).map(field => <label key={field.key} className="text-xs font-bold text-gray-700">{field.label}<input type="url" value={values[field.key]} onChange={e => w.editField(field.key, e.target.value)} placeholder={field.placeholder} className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-medium outline-none focus:border-bkhn-red focus:bg-white" /></label>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-xs font-semibold text-gray-600"><input type="checkbox" checked={values[splitKey]} onChange={e => w.editField(splitKey, e.target.checked)} className="accent-bkhn-red" />Mặc định chia đôi trên máy tính</label><button onClick={() => w.setActiveTab("documents")} className="text-xs font-bold text-bkhn-red">Tải PDF lên trong Tài liệu →</button></div>
      <p className="text-xs leading-relaxed text-gray-500">Phần này tùy chọn: thêm video, PDF hoặc cả hai. Để trống cả hai để bỏ qua khi học. Quản lý tài liệu và quyền tải tại phần 3.</p>
      <button disabled={!!w.savingField} onClick={() => void w.saveLessonFields({ [videoKey]: values[videoKey], [pdfKey]: values[pdfKey], [splitKey]: values[splitKey] })} className="rounded-xl bg-bkhn-red px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">{w.savingField ? "Đang lưu…" : "Lưu bước này"}</button>
    </div>
    <LessonMediaView key={`${step}:${values[splitKey]}`} title={`Xem thử · ${title}`} videoUrl={values[videoKey]} documentUrl={values[pdfKey]} splitView={values[splitKey]} watermark={file?.watermark ? "Xem thử · email học viên" : undefined} />
  </div>;
}
