"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Folder, ArrowUp, ArrowDown, Edit3, Trash2, Plus, Video, FileText, Eye, EyeOff, ListChecks, CalendarClock, Check, X, GripVertical } from "lucide-react";
import { toDatetimeLocalValue, toUtcISOString } from "@/lib/datetime";
import type { Chapter, Lesson } from "../types";
import { chapterSchedule, matchesChapter } from "../chapter-filter";

type ChapterPatch = Pick<Chapter, "title" | "description" | "status" | "openAt" | "closeAt">;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

type ChapterNodeProps = {
  chapter: Chapter;
  search?: string;
  statusFilter?: string;
  onDirtyChange: (id: string, dirty: boolean) => void;
  hasUnsavedContent?: boolean;
  onMoveTo: (kind: "chapter" | "lesson", id: string, targetId: string) => void;
  reorderDisabled?: boolean;
  contentDisabled?: boolean;
  depth: number;
  siblings: Chapter[];
  index: number;
  expandedChapters: Set<string>;
  onToggleExpand: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onAddLesson: (chapterId: string) => void;
  onUpdateChapter: (id: string, patch: ChapterPatch) => Promise<string | null>;
  onDeleteChapter: (id: string) => void;
  onReorderChapter: (id: string, direction: "up" | "down") => void;
  onEditLesson: (chapterId: string, lesson: Lesson) => void;
  onDeleteLesson: (id: string) => void;
  onReorderLesson: (id: string, direction: "up" | "down") => void;
  onToggleLessonStatus: (lesson: Lesson) => void;
};

export default function ChapterNode(props: ChapterNodeProps) {
  const {
    chapter, search = "", statusFilter = "all", onDirtyChange, onMoveTo, hasUnsavedContent = false, reorderDisabled = false, contentDisabled = false, depth, siblings, index, expandedChapters, onToggleExpand,
    onAddChild, onAddLesson, onUpdateChapter, onDeleteChapter, onReorderChapter,
    onEditLesson, onDeleteLesson, onReorderLesson, onToggleLessonStatus,
  } = props;

  const isExpanded = Boolean(search.trim()) || statusFilter !== "all" || expandedChapters.has(chapter.id);
  const hasContent = chapter.children.length > 0 || chapter.lessons.length > 0;
  const actionsDisabled = contentDisabled || hasUnsavedContent;
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(chapter.title);
  const [description, setDescription] = useState(chapter.description ?? "");
  const [status, setStatus] = useState<Chapter["status"]>(chapter.status);
  const [openAt, setOpenAt] = useState(toDatetimeLocalValue(chapter.openAt));
  const [closeAt, setCloseAt] = useState(toDatetimeLocalValue(chapter.closeAt));
  const [editError, setEditError] = useState<string | null>(null);
  const dirty = editing && (title !== chapter.title || description !== (chapter.description ?? "") || status !== chapter.status || openAt !== toDatetimeLocalValue(chapter.openAt) || closeAt !== toDatetimeLocalValue(chapter.closeAt));
  useEffect(() => {
    onDirtyChange(chapter.id, dirty);
    return () => onDirtyChange(chapter.id, false);
  }, [chapter.id, dirty, onDirtyChange]);

  function beginEdit() {
    setTitle(chapter.title); setDescription(chapter.description ?? ""); setStatus(chapter.status);
    setOpenAt(toDatetimeLocalValue(chapter.openAt)); setCloseAt(toDatetimeLocalValue(chapter.closeAt));
    setEditError(null); setEditing(true);
  }

  async function submitEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) { setEditError("Tên cụm không được để trống."); return; }
    const normalizedOpen = toUtcISOString(openAt);
    const normalizedClose = toUtcISOString(closeAt);
    if (normalizedOpen && normalizedClose && new Date(normalizedClose) <= new Date(normalizedOpen)) {
      setEditError("Ngày đóng phải sau ngày mở."); return;
    }
    const error = await onUpdateChapter(chapter.id, {
      title: title.trim(), description: description.trim() || null, status,
      openAt: normalizedOpen, closeAt: normalizedClose,
    });
    setEditError(error);
    if (!error) setEditing(false);
  }
  function drag(event: React.DragEvent, kind: "chapter" | "lesson", id: string) {
    if (reorderDisabled) { event.preventDefault(); return; }
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", JSON.stringify({ kind, id }));
  }
  function drop(event: React.DragEvent, kind: "chapter" | "lesson", targetId: string) {
    event.preventDefault(); event.stopPropagation();
    if (reorderDisabled) return;
    try {
      const item = JSON.parse(event.dataTransfer.getData("text/plain"));
      if (item.kind === kind && typeof item.id === "string") onMoveTo(kind, item.id, targetId);
    } catch { /* Ignore drags from outside this editor. */ }
  }

  if (!matchesChapter(chapter, search, statusFilter)) return null;
  return (
    <div id={`chapter-${chapter.id}`} style={depth > 0 ? { marginLeft: 12 } : undefined} className={`scroll-mt-24 ${depth > 0 ? "border-l-2 border-gray-100 pl-3" : ""}`}>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-2">
        {editing ? (
          <form onSubmit={submitEdit} className="space-y-4 border-l-4 border-yellow-400 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-gray-500">Tên cụm</span>
                <input required maxLength={250} autoFocus disabled={contentDisabled} value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2.5 text-sm font-bold outline-none transition-all focus:border-yellow-500 focus:bg-white focus:ring-4 focus:ring-yellow-500/10 disabled:opacity-60" />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-gray-500">Mô tả</span>
                <textarea maxLength={10000} rows={2} disabled={contentDisabled} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mô tả ngắn nội dung của cụm" className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2.5 text-sm outline-none transition-all focus:border-yellow-500 focus:bg-white focus:ring-4 focus:ring-yellow-500/10 disabled:opacity-60" />
              </label>
              <label>
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-gray-500">Mở từ</span>
                <input type="datetime-local" disabled={contentDisabled} value={openAt} onChange={(event) => setOpenAt(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2.5 text-xs font-semibold outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/10 disabled:opacity-60" />
              </label>
              <label>
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-gray-500">Đóng lúc</span>
                <input type="datetime-local" disabled={contentDisabled} value={closeAt} onChange={(event) => setCloseAt(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2.5 text-xs font-semibold outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/10 disabled:opacity-60" />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div role="group" aria-label="Trạng thái cụm" className="flex rounded-xl bg-gray-100 p-1">
                {(["DRAFT", "PUBLISHED"] as const).map((value) => <button key={value} type="button" disabled={contentDisabled} onClick={() => setStatus(value)} className={`rounded-lg px-3 py-1.5 text-xs font-black transition-all ${status === value ? value === "PUBLISHED" ? "bg-green-600 text-white shadow-sm" : "bg-gray-800 text-white shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>{value === "PUBLISHED" ? "Đã xuất bản" : "Bản nháp"}</button>)}
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={contentDisabled} onClick={() => { if (!dirty || confirm("Bỏ thay đổi chưa lưu của cụm này?")) { setEditing(false); setEditError(null); } }} className="flex items-center gap-1 rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 disabled:opacity-50"><X size={14} /> Hủy</button>
                <button type="submit" disabled={contentDisabled} className="flex items-center gap-1 rounded-xl bg-yellow-500 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-yellow-600 disabled:opacity-50"><Check size={14} /> Lưu thay đổi</button>
              </div>
            </div>
            {editError && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{editError}</p>}
          </form>
        ) : <div onDragOver={(event) => { if (!reorderDisabled) event.preventDefault(); }} onDrop={(event) => drop(event, "chapter", chapter.id)} className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-start sm:justify-between">
          <div
            role="button" tabIndex={0} aria-expanded={isExpanded} aria-label={`Mở/đóng cụm ${chapter.title}`}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onToggleExpand(chapter.id); } }}
            onClick={() => onToggleExpand(chapter.id)}
            className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5 font-bold text-gray-800"
          >
            {isExpanded ? <ChevronDown size={17} className="mt-0.5 shrink-0 text-gray-500" /> : <ChevronRight size={17} className="mt-0.5 shrink-0 text-gray-400" />}
            <Folder className="mt-0.5 shrink-0 text-yellow-500" size={18} />
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm">{chapter.title}</span>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${chapter.status === "PUBLISHED" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>{chapter.status === "PUBLISHED" ? "Đã xuất bản" : "Bản nháp"}</span>
                {(chapter.children.length > 0 || chapter.lessons.length > 0) && <span className="text-[11px] font-medium text-gray-400">
                  {chapter.children.length > 0 && `${chapter.children.length} cụm con`}{chapter.children.length > 0 && chapter.lessons.length > 0 && " · "}{chapter.lessons.length > 0 && `${chapter.lessons.length} bài`}
                </span>}
              </span>
              {chapter.description && <span title={chapter.description} className={`mt-1 block text-xs font-medium leading-relaxed text-gray-500 ${isExpanded ? "whitespace-pre-line" : "line-clamp-2"}`}>{chapter.description}</span>}
              <span className="mt-1.5 block text-[10px] font-bold text-gray-500">{chapterSchedule(chapter)}{chapter.status === "PUBLISHED" && " · còn phụ thuộc lịch khóa học và tiến trình"}</span>
              {(chapter.openAt || chapter.closeAt) && <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-amber-700"><CalendarClock size={12} />{chapter.openAt && <span>Mở {formatDate(chapter.openAt)}</span>}{chapter.closeAt && <span>Đóng {formatDate(chapter.closeAt)}</span>}</span>}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1" onClick={e => e.stopPropagation()}>
            <span draggable={!reorderDisabled} onDragStart={(event) => drag(event, "chapter", chapter.id)} title="Kéo đổi vị trí trong cùng nhóm; hoặc dùng nút lên/xuống" className={`rounded-lg p-1.5 text-gray-400 ${reorderDisabled ? "opacity-30" : "cursor-grab hover:bg-gray-100"}`}><GripVertical size={16} /></span>
            <div role="group" className="mr-1 flex rounded-xl border border-bkhn-pink bg-bkhn-rose p-0.5 shadow-bkhn-sm" aria-label="Đổi vị trí cụm">
              <button title="Đưa lên" onClick={() => onReorderChapter(chapter.id, "up")} disabled={reorderDisabled || index === 0} aria-label={`Đưa cụm ${chapter.title} lên`} className="rounded-lg p-1.5 text-bkhn-red transition-all hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:text-gray-300 disabled:opacity-60"><ArrowUp size={14} strokeWidth={2.5} /></button>
              <button title="Đưa xuống" onClick={() => onReorderChapter(chapter.id, "down")} disabled={reorderDisabled || index === siblings.length - 1} aria-label={`Đưa cụm ${chapter.title} xuống`} className="rounded-lg p-1.5 text-bkhn-red transition-all hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:text-gray-300 disabled:opacity-60"><ArrowDown size={14} strokeWidth={2.5} /></button>
            </div>
            <button aria-label={`Sửa cụm ${chapter.title}`} disabled={actionsDisabled} onClick={beginEdit} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-yellow-50 hover:text-yellow-600 disabled:cursor-not-allowed disabled:opacity-30"><Edit3 size={14} /></button>
            <button aria-label={`Xóa cụm ${chapter.title}`} disabled={actionsDisabled} onClick={() => onDeleteChapter(chapter.id)} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 size={14} /></button>
          </div>
        </div>}

        {isExpanded && !editing && (
          <div className="border-t border-gray-100 bg-gray-50/50 p-3 space-y-3">
            <div className="flex gap-2 flex-wrap">
              <button disabled={actionsDisabled} onClick={() => onAddChild(chapter.id)} className="flex items-center gap-1 rounded-lg bg-yellow-50 px-3 py-1.5 text-xs font-bold text-yellow-700 transition-colors hover:bg-yellow-100 disabled:cursor-not-allowed disabled:opacity-40">
                <Plus size={13} /> Thêm Cụm con
              </button>
              <button disabled={actionsDisabled} onClick={() => onAddLesson(chapter.id)} className="flex items-center gap-1 rounded-lg bg-bkhn-pale px-3 py-1.5 text-xs font-bold text-bkhn-red transition-colors hover:bg-bkhn-pink disabled:cursor-not-allowed disabled:opacity-40">
                <Plus size={13} /> Thêm Bài học
              </button>
            </div>

            {!hasContent && (
              <p className="text-xs text-gray-400 italic py-1">Chưa có nội dung — thêm Cụm con hoặc Bài học.</p>
            )}

            {chapter.lessons.map((lesson, lIdx) => (
              <div key={lesson.id} onDragOver={(event) => { if (!reorderDisabled) event.preventDefault(); }} onDrop={(event) => drop(event, "lesson", lesson.id)} className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-gray-200 hover:border-bkhn-pink group transition-colors">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 min-w-0">
                  {lesson.videoTheoryUrl || lesson.videoPracticeUrl ? <Video size={15} className="text-bkhn-red shrink-0" /> : <FileText size={15} className="text-gray-400 shrink-0" />}
                  <span className="truncate">{lesson.title}</span>
                  <button
                    disabled={actionsDisabled}
                    onClick={() => onToggleLessonStatus(lesson)}
                    className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                      lesson.status === "PUBLISHED" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {lesson.status === "PUBLISHED" ? <Eye size={10} /> : <EyeOff size={10} />}
                    {lesson.status === "PUBLISHED" ? "Đã xuất bản" : "Nháp"}
                  </button>
                </div>
                <div className="flex gap-1 shrink-0">
                  <span draggable={!reorderDisabled} onDragStart={(event) => drag(event, "lesson", lesson.id)} title="Kéo đổi vị trí trong cùng cụm" className={`p-1.5 text-gray-400 ${reorderDisabled ? "opacity-30" : "cursor-grab"}`}><GripVertical size={14} /></span>
                  <div role="group" className="mr-0.5 flex rounded-lg border border-bkhn-pink bg-bkhn-rose p-0.5" aria-label="Đổi vị trí bài học">
                    <button title="Đưa lên" onClick={() => onReorderLesson(lesson.id, "up")} disabled={reorderDisabled || lIdx === 0} aria-label={`Đưa bài ${lesson.title} lên`} className="rounded-md p-1 text-bkhn-red transition-colors hover:bg-white disabled:cursor-not-allowed disabled:text-gray-300 disabled:opacity-60"><ArrowUp size={12} strokeWidth={2.5} /></button>
                    <button title="Đưa xuống" onClick={() => onReorderLesson(lesson.id, "down")} disabled={reorderDisabled || lIdx === chapter.lessons.length - 1} aria-label={`Đưa bài ${lesson.title} xuống`} className="rounded-md p-1 text-bkhn-red transition-colors hover:bg-white disabled:cursor-not-allowed disabled:text-gray-300 disabled:opacity-60"><ArrowDown size={12} strokeWidth={2.5} /></button>
                  </div>
                  <Link href={`/dashboard/lessons/${lesson.id}/questions`} className="p-1.5 text-bkhn-red bg-bkhn-pale rounded-lg"><ListChecks size={13} /></Link>
                  <button disabled={actionsDisabled} onClick={() => onEditLesson(chapter.id, lesson)} className="p-1.5 text-gray-500 hover:bg-yellow-50 hover:text-yellow-600 rounded-lg bg-gray-50 transition-colors"><Edit3 size={13} /></button>
                  <button disabled={actionsDisabled} onClick={() => onDeleteLesson(lesson.id)} className="p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg bg-gray-50 transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}

            {chapter.children.map((child, cIdx) => (
              <ChapterNode
                key={child.id}
                chapter={child}
                search={search}
                statusFilter={statusFilter}
                onDirtyChange={onDirtyChange}
                hasUnsavedContent={hasUnsavedContent}
                onMoveTo={onMoveTo}
                reorderDisabled={reorderDisabled}
                contentDisabled={contentDisabled}
                depth={depth + 1}
                siblings={chapter.children}
                index={cIdx}
                expandedChapters={expandedChapters}
                onToggleExpand={onToggleExpand}
                onAddChild={onAddChild}
                onAddLesson={onAddLesson}
                onUpdateChapter={onUpdateChapter}
                onDeleteChapter={onDeleteChapter}
                onReorderChapter={onReorderChapter}
                onEditLesson={onEditLesson}
                onDeleteLesson={onDeleteLesson}
                onReorderLesson={onReorderLesson}
                onToggleLessonStatus={onToggleLessonStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
