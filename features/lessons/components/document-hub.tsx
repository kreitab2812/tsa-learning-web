"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CloudUpload, Loader2, Link2, Plus, Trash2 } from "lucide-react";
import { useAdminResource } from "@/features/admin/use-admin-resource";
import { adminJson, errorMessage } from "@/features/admin/api";
import RequestError from "@/features/admin/components/request-error";
import { MAX_UPLOAD_BYTES, type LessonAttachmentView } from "../attachments";
import DocumentLibrary from "./document-library";

type DriveStatus = { configured: boolean; connected: boolean; email: string | null };
const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-bkhn-red focus:outline-none";

export default function DocumentHub({ lessonId, files, onAttachmentChange, onBusyChange }: {
  lessonId: string; files: LessonAttachmentView[]; onAttachmentChange: (file: LessonAttachmentView, removed?: boolean) => void; onBusyChange: (busy: boolean) => void;
}) {
  const base = `/api/admin/lessons/${lessonId}/attachments`;
  const drive = useAdminResource<DriveStatus>("/api/admin/drive");
  const query = useSearchParams();
  const targetAttachment = query.get("attachment");
  useEffect(() => {
    if (targetAttachment) document.getElementById(`attachment-${targetAttachment}`)?.scrollIntoView({ block: "center" });
  }, [targetAttachment, files]);
  const [busy, setBusy] = useState(false), pending = useRef(false);
  const [message, setMessage] = useState<string | null>(null), [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<LessonAttachmentView["section"]>("DOCUMENTS");
  const [kind, setKind] = useState("PDF"), [title, setTitle] = useState(""), [url, setUrl] = useState("");
  async function run(work: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true; setBusy(true); onBusyChange(true); setError(null); setMessage(null);
    try { await work(); } catch (cause) { setError(errorMessage(cause)); }
    finally { pending.current = false; setBusy(false); onBusyChange(false); }
  }
  function remember(file: LessonAttachmentView) {
    onAttachmentChange(file);
  }
  function upload(file?: File) {
    if (!file || !drive.data?.connected || !drive.data.configured) return;
    void run(async () => {
      if (file.size > MAX_UPLOAD_BYTES || !file.size) throw new Error("Tệp phải có nội dung và không quá 4 MB.");
      if (!/\.(pdf|doc|docx|zip)$/i.test(file.name)) throw new Error("Chỉ nhận PDF, DOC, DOCX và ZIP.");
      const params = new URLSearchParams({ name: file.name, section });
      const result = await adminJson<{ attachment: LessonAttachmentView; message: string }>(`${base}/upload?${params}`, { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: file });
      remember(result.attachment); setMessage(result.message);
    });
  }
  function patch(file: LessonAttachmentView, changes: Partial<Pick<LessonAttachmentView, "title" | "allowDownload" | "watermark">>) {
    void run(async () => {
      const result = await adminJson<{ attachment: LessonAttachmentView }>(base, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: file.id, title: file.title, allowDownload: file.allowDownload, watermark: file.watermark, ...changes }) });
      remember(result.attachment); setMessage("Đã lưu cài đặt tài liệu.");
    });
  }
  return <div className="space-y-5">
    <fieldset disabled={busy} className="min-w-0 space-y-4 disabled:opacity-60">
      <div className="rounded-2xl border border-bkhn-pink bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-black text-gray-900">Tài liệu của bài học</h2><p className="mt-1 text-xs text-gray-500">Tùy chọn · Thêm một hoặc nhiều liên kết; không bắt buộc có tài liệu.</p></div><label className="flex items-center gap-2 text-xs text-gray-600">Gắn vào<select value={section} onChange={e => { setSection(e.target.value as typeof section); setKind("PDF"); }} className="rounded-xl border border-gray-200 p-2"><option value="DOCUMENTS">Thư viện tài liệu</option><option value="THEORY">Lý thuyết</option><option value="PRACTICE">Thực hành</option></select></label></div>
        {section !== "DOCUMENTS" && <p className="mb-3 text-xs text-amber-800">Mỗi bước có một PDF đi kèm. Thêm mới sẽ thay link PDF hiện tại của bước, không xóa tệp cũ trên Drive.</p>}

        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50/70 p-4"><div className="mb-3 flex items-center gap-2"><span className="rounded-lg bg-white p-2 text-bkhn-red"><Link2 size={15} /></span><div><h3 className="text-xs font-black text-gray-800">Thêm bằng liên kết Google Drive</h3><p className="mt-0.5 text-[10px] text-gray-500">Có thể thêm nhiều tài liệu, lần lượt từng link.</p></div></div><div className="grid gap-3 sm:grid-cols-2">
          <input aria-label="Tên tài liệu" value={title} onChange={e => setTitle(e.target.value)} placeholder="Tên tài liệu" maxLength={250} className={inputClass} />
          <select aria-label="Loại tài liệu" value={kind} onChange={e => setKind(e.target.value)} className={inputClass}><option value="PDF">PDF</option>{section === "DOCUMENTS" && <><option value="WORD">Word</option><option value="ZIP">ZIP</option></>}</select>
          <input aria-label="Link Google Drive" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://drive.google.com/file/d/.../view" className={`${inputClass} sm:col-span-2`} />
          <p className="text-[11px] text-gray-500 sm:col-span-2">Với link có sẵn, loại tệp do Admin chọn; LMS không tự xác minh dung lượng hoặc quyền Google.</p>
          <button disabled={!title.trim() || !url.trim()} onClick={() => void run(async () => {
            const result = await adminJson<{ attachment: LessonAttachmentView }>(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, url, kind, section }) });
            remember(result.attachment); setTitle(""); setUrl(""); setMessage("Đã thêm tài liệu vào bài.");
          })} className="flex items-center justify-center gap-2 rounded-xl bg-bkhn-red px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Plus size={14} />Thêm tài liệu</button>
        </div></div>
        <details className="mt-4 rounded-xl border border-gray-200 p-4"><summary className="cursor-pointer text-xs font-bold text-bkhn-red">Hoặc tải tệp từ máy lên Google Drive</summary><div className="mt-3"><label onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!busy) { if (e.dataTransfer.files.length !== 1) { setError("Mỗi lần chọn một tệp."); return; } upload(e.dataTransfer.files[0]); } }} className={`flex flex-col items-center rounded-2xl border-2 border-dashed border-bkhn-pink bg-bkhn-pale/40 p-6 text-center ${drive.data?.connected && drive.data.configured ? "cursor-pointer hover:bg-bkhn-pale" : "opacity-50"}`}>
          <CloudUpload size={28} className="mb-2 text-bkhn-red" /><span className="text-sm font-bold text-gray-800">Kéo thả hoặc chọn tệp</span><span className="mt-1 text-xs text-gray-500">{section === "DOCUMENTS" ? "PDF, Word, ZIP" : "Chỉ PDF"} · tối đa 4 MB · lưu ngay vào bài</span>
          <input aria-label="Tải tài liệu lên Google Drive" type="file" disabled={!drive.data?.connected || !drive.data.configured} accept={section === "DOCUMENTS" ? ".pdf,.doc,.docx,.zip" : ".pdf"} className="mt-3 max-w-full text-xs" onChange={e => { upload(e.target.files?.[0]); e.target.value = ""; }} />
        </label></div></details>
      </div>
      {files.length > 0 && <details open={!!targetAttachment || undefined} className="rounded-2xl border border-bkhn-pink bg-white p-4"><summary className="cursor-pointer text-sm font-bold">Quản lý tài liệu ({files.length}) · cài đặt lưu ngay</summary>
        <p className="mt-3 text-[11px] text-gray-500">Tắt tải chỉ ẩn/chặn nút tải của LMS. Nút tải trong Google phải tắt ở cài đặt chia sẻ Drive. Watermark là lớp phủ email trên khung xem, không sửa PDF.</p>
        <div className="mt-3 divide-y divide-gray-100">{files.map(file => <div id={`attachment-${file.id}`} key={file.id} className="space-y-3 py-3"><div className="flex items-start justify-between gap-2"><button onClick={() => { const value = prompt("Tên tài liệu", file.title); if (value?.trim() && value !== file.title) patch(file, { title: value }); }} className="text-left text-xs font-bold text-gray-700 hover:text-bkhn-red">{file.title} · Đổi tên</button><button aria-label={`Gỡ ${file.title} khỏi bài`} onClick={() => { if (confirm("Gỡ tài liệu khỏi bài? Tệp trên Drive vẫn được giữ nguyên.")) void run(async () => {
          await adminJson(base, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: file.id }) });
          onAttachmentChange(file, true); setMessage("Đã gỡ khỏi bài. Tệp trên Google Drive vẫn còn.");
        }); }} className="text-gray-400 hover:text-red-600"><Trash2 size={15} /></button></div>
          <div className="flex flex-wrap gap-4 text-xs text-gray-600"><label className="flex items-center gap-2"><input type="checkbox" checked={file.allowDownload} onChange={e => patch(file, { allowDownload: e.target.checked })} className="accent-bkhn-red" />Nút tải trong LMS</label>{file.kind === "PDF" && <label className="flex items-center gap-2"><input type="checkbox" checked={file.watermark} onChange={e => patch(file, { watermark: e.target.checked })} className="accent-bkhn-red" />Watermark email</label>}</div>
        </div>)}</div>
      </details>}
    </fieldset>
    <details className="rounded-2xl border border-bkhn-pink bg-white p-5"><summary className="cursor-pointer text-sm font-bold text-gray-700">Kết nối Google Drive · Tùy chọn khi tải tệp từ máy</summary><div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-black text-gray-900">Kết nối Google Drive</h2><p className="mt-1 text-xs text-gray-500">{drive.data?.connected ? `Tài khoản: ${drive.data.email}` : "Chưa kết nối · Tệp sẽ lưu vào Drive của cậu"}</p></div>
        <div className="flex gap-2 text-xs font-bold"><button disabled={busy || !drive.data?.configured} onClick={() => void run(async () => {
          const result = await adminJson<{ url: string }>("/api/admin/drive/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId }) });
          window.location.assign(result.url);
        })} className="rounded-xl bg-bkhn-red px-4 py-2.5 text-white disabled:opacity-40">{drive.data?.connected ? "Kết nối lại" : "Kết nối Drive"}</button>
        {drive.data?.connected && <button disabled={busy} onClick={() => { if (confirm("Ngắt kết nối trong LMS? Các tệp trên Drive vẫn được giữ nguyên.")) void run(async () => { await adminJson("/api/admin/drive", { method: "DELETE" }); await drive.refresh(); }); }} className="rounded-xl bg-gray-100 px-3 py-2.5 text-gray-600">Ngắt kết nối</button>}</div>
      </div>
      {query.get("drive") === "failed" && <p role="alert" className="mt-3 text-xs text-red-700">Chưa kết nối được Drive. Hãy cấp quyền khi Google hỏi hoặc kiểm tra cấu hình rồi thử lại.</p>}
      {!drive.data?.configured && <details className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"><summary className="cursor-pointer font-bold">Cần thiết lập Google một lần trước khi upload</summary><p className="mt-2">Bật Drive API, tạo OAuth Client dạng Web và khai báo callback /api/admin/drive/callback. Thiết lập GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REDIRECT_URI và GOOGLE_DRIVE_TOKEN_KEY trên máy chủ. Chi tiết trong docs/google-drive.md. Không dán secret vào cuộc trò chuyện.</p></details>}
      <p className="mt-3 text-[11px] leading-relaxed text-gray-500">Chỉ xin quyền với tệp do ứng dụng tạo. Upload không tự chia sẻ công khai: sau khi tải, mở Drive và cấp quyền xem cho học viên. Kết nối Google có thể cần đăng nhập lại khi hết hạn.</p>
      <RequestError message={drive.error} retry={() => void drive.refresh()} />
    </div></details>
    {busy && <p role="status" className="flex items-center gap-2 text-xs text-bkhn-red"><Loader2 size={15} className="animate-spin" />Đang xử lý, vui lòng giữ trang này mở…</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{message}</p>}
    <DocumentLibrary files={files} viewerEmail="Xem thử · email học viên" />
  </div>;
}
