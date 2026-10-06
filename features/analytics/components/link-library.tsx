"use client";
import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Link2 } from "lucide-react";
import type { HealthDashboard } from "@/server/admin/health-queries";
import { LESSON_LINK_FIELDS } from "../link-fields";
import Pagination from "@/features/admin/components/pagination";
import LinkScanButton from "./link-scan-button";

const statusText = { UNKNOWN: "Chưa kiểm tra", HEALTHY: "Truy cập được", BROKEN: "Không truy cập được", BLOCKED: "Cần kiểm tra quyền / giới hạn" };
const statusStyle = { UNKNOWN: "bg-gray-100 text-gray-500", HEALTHY: "bg-green-50 text-green-700", BROKEN: "bg-red-50 text-red-700", BLOCKED: "bg-amber-50 text-amber-800" };
export default function LinkLibrary({ links, subjectId, chapterId, lessonId }: { links: HealthDashboard["links"]; subjectId?: string; chapterId?: string; lessonId?: string }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [kind, setKind] = useState("all");
  const [page, setPage] = useState(1);
  const filtered = links.filter((link) => (status === "all" || link.status === status) && (kind === "all" || link.category === kind) && `${link.lessonTitle} ${link.chapterTitle} ${link.label} ${link.url}`.toLocaleLowerCase("vi-VN").includes(search.toLocaleLowerCase("vi-VN")));
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pages);
  return <section id="links" className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 font-black text-gray-900"><Link2 size={18} className="text-bkhn-red" />Thư viện link <span className="text-xs font-medium text-gray-400">{links.length} link</span></h2><p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-500">Kiểm tra phản hồi của đường dẫn, chưa xác nhận video phát được hoặc tài liệu đúng quyền. Mỗi lượt cách nhau 60 giây; ưu tiên link chưa quét hoặc kết quả cũ nhất.</p></div><LinkScanButton subjectId={subjectId} chapterId={chapterId} lessonId={lessonId} /></div>
    <div className="mt-5 grid gap-2 sm:grid-cols-3"><input aria-label="Tìm link" placeholder="Tìm bài học, cụm hoặc URL…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="rounded-xl border border-gray-200 px-3 py-2 text-sm" /><select aria-label="Trạng thái link" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="rounded-xl border border-gray-200 px-3 py-2 text-sm"><option value="all">Mọi trạng thái</option>{Object.entries(statusText).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><select aria-label="Loại link" value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); }} className="rounded-xl border border-gray-200 px-3 py-2 text-sm"><option value="all">Mọi loại tài nguyên</option><option value="ATTACHMENT">Tệp đính kèm</option>{LESSON_LINK_FIELDS.map((item) => <option key={item.kind} value={item.kind}>{item.label}</option>)}</select></div>
    <div className="mt-4 divide-y divide-gray-100">{filtered.slice((currentPage - 1) * 20, currentPage * 20).map((link) => <article key={`${link.lessonId}:${link.kind}`} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="text-sm font-bold text-gray-900">{link.lessonTitle} <span className="font-medium text-gray-400">· {link.label}</span></p><p className="mt-1 text-xs text-gray-400">{link.subjectTitle} · {link.chapterTitle}</p><a href={link.url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 text-xs text-bkhn-red hover:underline"><span className="truncate">{link.url}</span><ExternalLink size={12} className="shrink-0" /></a><p className="mt-2 text-[11px] text-gray-400">{link.checkedAt ? `Kiểm tra: ${new Date(link.checkedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}` : "Chưa có kết quả quét"}{link.statusCode ? ` · HTTP ${link.statusCode}` : ""}</p>{link.error && <p className="mt-1 break-words text-xs text-gray-500">{link.error}</p>}</div><div className="flex flex-wrap items-center gap-2 sm:max-w-64 sm:justify-end"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusStyle[link.status]}`}>{statusText[link.status]}</span><Link href={link.editHref} className="rounded-xl border border-bkhn-pink px-3 py-2 text-xs font-bold text-bkhn-red">Sửa tại bài →</Link><LinkScanButton subjectId={subjectId} chapterId={chapterId} lessonId={link.lessonId} kind={link.kind} /></div></article>)}</div>
    {!filtered.length && <p className="py-8 text-center text-sm text-gray-400">Không có link phù hợp.</p>}
    <div className="mt-4"><Pagination page={currentPage} totalPages={pages} hasMore={currentPage < pages} busy={false} itemCount={Math.max(0, Math.min(20, filtered.length - (currentPage - 1) * 20))} itemLabel="link" onChange={setPage} /></div>
  </section>;
}
