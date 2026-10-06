import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2, Eye, LockKeyhole, Sparkles } from "lucide-react";
import { idSchema } from "@/features/content/schemas";
import type { LearningChapter } from "@/features/learning/types";
import { requirePageUser } from "@/server/auth/session";
import { getLearningSubject } from "@/server/learning/service";
import { parsePreviewParams } from "@/server/learning/preview-params";
import { previewQuery } from "@/features/courses/navigation";
import SubjectViewNav from "@/features/courses/components/subject-view-nav";
import PreviewBanner from "@/features/learning/components/preview-banner";

function formatDate(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }

function ChapterView({ chapter, subjectId, preview, unlock, showDrafts, simulated, depth = 0 }: {
  chapter: LearningChapter; subjectId: string; preview: boolean; unlock: string | null; showDrafts: boolean; simulated: string[]; depth?: number;
}) {
  const query = preview ? previewQuery({ showDrafts, simulated, unlock }) : "";
  return <div id={`chapter-${chapter.id}`} className={`scroll-mt-64 ${depth ? "ml-3 border-l-2 border-bkhn-pink pl-3 sm:ml-4 sm:pl-4" : ""}`}>
    <section className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${chapter.magicUnlocked ? "border-amber-300 ring-4 ring-amber-100" : chapter.locked ? "border-gray-200" : "border-bkhn-pink"}`}>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <BookOpen size={18} className={chapter.locked ? "text-gray-400" : "text-bkhn-red"} />
            <h2 className="font-black text-gray-900">{chapter.title}</h2>
            {preview && <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${chapter.status === "PUBLISHED" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>{chapter.status === "PUBLISHED" ? "Đã xuất bản" : "Bản nháp"}</span>}
            {chapter.magicUnlocked && <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700"><Sparkles size={11} /> Magic Unlock</span>}
          </div>
          {chapter.description && <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{chapter.description}</p>}
          {(chapter.openAt || chapter.closeAt) && <p className="mt-2 text-xs font-semibold text-amber-700">{chapter.openAt && `Mở ${formatDate(chapter.openAt)}`}{chapter.openAt && chapter.closeAt && " · "}{chapter.closeAt && `Đóng ${formatDate(chapter.closeAt)}`}</p>}
          {chapter.lockReason && <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-gray-500"><LockKeyhole size={13} /> {chapter.lockReason}</p>}
        </div>
        {chapter.canMagicUnlock && !chapter.magicUnlocked && <Link href={`/learn/subjects/${subjectId}${previewQuery({ showDrafts, simulated, unlock: chapter.id })}#chapter-${chapter.id}`} className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-amber-100 px-3 py-2 text-xs font-black text-amber-700 transition-colors hover:bg-amber-200"><Sparkles size={14} /> Magic Unlock</Link>}
      </div>
      {chapter.lessons.length > 0 && <div className="space-y-2 border-t border-gray-100 bg-gray-50/60 p-3">
        {chapter.lessons.map((lesson) => lesson.locked ? <div key={lesson.id} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-400"><LockKeyhole size={14} /> <span className="flex-1">{lesson.title}</span>{preview && lesson.status === "DRAFT" && <span className="text-[10px]">BẢN NHÁP</span>}</div> :
          <Link key={lesson.id} href={`/learn/lessons/${lesson.id}${query}`} className="group flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-gray-700 transition-all hover:border-bkhn-pink hover:text-bkhn-red hover:shadow-bkhn-sm">
            {lesson.completed ? <CheckCircle2 size={16} className="text-green-500" /> : <Eye size={16} className="text-bkhn-red" />}<span className="flex-1">{lesson.title}</span><span className="text-xs text-gray-400 group-hover:text-bkhn-red">Mở bài →</span>
          </Link>)}
      </div>}
    </section>
    {chapter.children.length > 0 && <div className="mt-2 space-y-2">{chapter.children.map((child) => <ChapterView key={child.id} chapter={child} subjectId={subjectId} preview={preview} unlock={unlock} showDrafts={showDrafts} simulated={simulated} depth={depth + 1} />)}</div>}
  </div>;
}

export default async function LearningSubjectPage({ params, searchParams }: {
  params: Promise<{ subjectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsed = idSchema.safeParse((await params).subjectId);
  if (!parsed.success) notFound();
  const query = await searchParams;
  const user = await requirePageUser();
  const subject = await getLearningSubject(user, parsed.data, parsePreviewParams(query));
  const chapterParam = Array.isArray(query.chapter) ? query.chapter[0] : query.chapter;
  const focusedChapter = idSchema.safeParse(chapterParam).success ? chapterParam : undefined;
  const flatten = (chapters: LearningChapter[]): LearningChapter[] => chapters.flatMap((chapter) => [chapter, ...flatten(chapter.children)]);
  const chapters = flatten(subject.chapters);
  const lessons = chapters.flatMap((chapter) => chapter.lessons);
  return <div className="mx-auto max-w-4xl space-y-6 animate-fade-up">
    {subject.preview && <><PreviewBanner courseId={subject.courseId} subjectId={subject.id} chapterId={focusedChapter} studentName={subject.previewStudentName} showDrafts={subject.showDrafts} simulated={subject.simulated} unlock={subject.unlockedChapterId} /><SubjectViewNav courseId={subject.courseId} subjectId={subject.id} chapterId={focusedChapter} active="preview" /></>}
    <header className="relative overflow-hidden rounded-[1.75rem] border border-bkhn-pink bg-white p-6 shadow-bkhn-sm">
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-bkhn-pale blur-3xl" />
      {!subject.preview && <Link href="/home" className="mb-4 inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-bkhn-red"><ArrowLeft size={14} /> Lộ trình</Link>}
      <p className="relative text-xs font-black uppercase tracking-wider text-bkhn-red">{subject.courseTitle} · {subject.stageTitle}</p>
      <h1 className="relative mt-2 text-2xl font-black tracking-tight text-gray-900">{subject.title}</h1>
      {subject.description && <p className="mt-2 text-sm leading-relaxed text-gray-500">{subject.description}</p>}
      {subject.teacherName && <p className="mt-3 text-xs font-bold text-gray-500">Giáo viên: {subject.teacherName}</p>}
      <div className="relative mt-5 flex flex-wrap gap-2"><span className="rounded-xl bg-gray-50 px-3 py-2 text-xs font-bold text-gray-600"><b className="text-gray-900">{chapters.length}</b> cụm kiến thức</span><span className="rounded-xl bg-gray-50 px-3 py-2 text-xs font-bold text-gray-600"><b className="text-gray-900">{lessons.length}</b> bài học</span><span className="rounded-xl bg-green-50 px-3 py-2 text-xs font-bold text-green-700"><b>{lessons.filter((lesson) => lesson.completed).length}</b> đã hoàn thành</span></div>
    </header>
    {subject.globalReason && <p className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">{subject.globalReason}{subject.preview && " Học viên hiện chưa thể mở nội dung này."}</p>}
    <div className="space-y-3">{subject.chapters.length ? subject.chapters.map((chapter) => <ChapterView key={chapter.id} chapter={chapter} subjectId={subject.id} preview={subject.preview} unlock={subject.unlockedChapterId} showDrafts={subject.showDrafts} simulated={subject.simulated} />) : <p className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">Chưa có cụm kiến thức được xuất bản.</p>}</div>
  </div>;
}
