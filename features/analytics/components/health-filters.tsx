"use client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import type { HealthDashboard } from "@/server/admin/health-queries";

export default function HealthFilters({ data }: { data: Pick<HealthDashboard, "filters" | "subjects" | "chapters" | "students"> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [subject, setSubject] = useState(data.filters.subject ?? "");
  const selectClass = "min-h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 focus:outline-bkhn-red";
  return <form action="/dashboard/health" aria-busy={pending} onSubmit={event => {
    event.preventDefault();
    const params = new URLSearchParams();
    new FormData(event.currentTarget).forEach((value, key) => { if (typeof value === "string" && value) params.set(key, value); });
    startTransition(() => router.push(`/dashboard/health?${params}`));
  }} className="grid gap-3 rounded-2xl border border-bkhn-pink bg-white p-4 sm:grid-cols-2 xl:grid-cols-6">
    <input type="hidden" name="view" value={data.filters.view} />
    <label className="space-y-1 text-xs font-bold text-gray-500">Học sinh<select name="student" defaultValue={data.filters.student ?? data.students[0]?.id ?? ""} className={selectClass}>{data.students.length ? data.students.map(item => <option key={item.id} value={item.id}>{item.name || item.email}</option>) : <option value="">Chưa có học sinh</option>}</select></label>
    <label className="space-y-1 text-xs font-bold text-gray-500">Môn học<select name="subject" value={subject} onChange={(event) => setSubject(event.target.value)} className={selectClass}><option value="">Tất cả môn</option>{data.subjects.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.courseTitle}</option>)}</select></label>
    <label className="space-y-1 text-xs font-bold text-gray-500">Cụm kiến thức<select name="chapter" key={subject} defaultValue={subject === data.filters.subject ? data.filters.chapter ?? "" : ""} className={selectClass}><option value="">Tất cả cụm</option>{subject === (data.filters.subject ?? "") && data.chapters.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
    <label className="space-y-1 text-xs font-bold text-gray-500">Hoạt động & điểm<select name="days" defaultValue={data.filters.days} className={selectClass}><option value="7">7 ngày gần đây</option><option value="30">30 ngày gần đây</option><option value="90">90 ngày gần đây</option><option value="all">Toàn bộ lịch sử</option></select></label>
    <label className="space-y-1 text-xs font-bold text-gray-500">Loại lỗi<select name="errorType" defaultValue={data.filters.errorType} className={selectClass}><option value="all">Tất cả lỗi</option><option value="VIDEO_LOAD">Video</option><option value="DOCUMENT_LOAD">Tài liệu</option><option value="SUBMISSION">Nộp bài</option></select></label>
    <button disabled={pending} className="flex items-center justify-center gap-2 disabled:opacity-60 min-h-10 self-end rounded-xl bg-bkhn-red px-4 py-2 text-sm font-bold text-white hover:bg-red-700">{pending && <Loader2 size={15} className="animate-spin motion-reduce:animate-none" />}{pending ? "Đang tải…" : "Áp dụng"}</button>
  </form>;
}
