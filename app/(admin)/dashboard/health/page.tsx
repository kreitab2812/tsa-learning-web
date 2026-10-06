import Link from "next/link";
import PageControls from "@/components/ui/page-controls";
import { Activity, AlertTriangle, HeartPulse, Trophy } from "lucide-react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { getAdminHealthDashboard } from "@/server/admin/health-queries";
import { HEALTH_PAGE_SIZE, healthFilterSchema, type HealthFilters } from "@/features/analytics/filters";
import HealthFilterForm from "@/features/analytics/components/health-filters";
import LinkLibrary from "@/features/analytics/components/link-library";
import SubjectViewNav from "@/features/courses/components/subject-view-nav";

function date(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value)); }
const activityLabel = { LESSON_OPENED: "Mở bài học", LESSON_COMPLETED: "Hoàn thành bài học", EXERCISE_SUBMITTED: "Nộp bài tập" } as const;
const errorLabel = { VIDEO_LOAD: "Video", DOCUMENT_LOAD: "Tài liệu", SUBMISSION: "Nộp bài" } as const;
function pageHref(filters: HealthFilters, key: string, value: number, anchor: string) {
  const query = new URLSearchParams(Object.entries(filters).map(([name, item]) => [name, String(item)]));
  query.set(key, String(value));
  return `/dashboard/health?${query}#${anchor}`;
}
function tabHref(filters: HealthFilters, view: HealthFilters["view"]) {
  const query = new URLSearchParams();
  query.set("view", view);
  query.set("days", filters.days);
  query.set("errorType", filters.errorType);
  if (filters.student) query.set("student", filters.student);
  if (filters.subject) query.set("subject", filters.subject);
  if (filters.chapter) query.set("chapter", filters.chapter);
  return `/dashboard/health?${query}`;
}
function Pager({ filters, field, total, more, anchor }: { filters: HealthFilters; field: "activityPage" | "attemptPage" | "errorPage"; total?: number; more?: boolean; anchor: string }) {
  const page = filters[field];
  const hasMore = more ?? page * HEALTH_PAGE_SIZE < (total ?? 0);
  return <PageControls page={page} totalPages={total === undefined ? undefined : Math.max(1, Math.ceil(total / HEALTH_PAGE_SIZE))} label={total === undefined ? "Nhật ký lỗi" : `${total} bản ghi`} previousHref={page > 1 ? pageHref(filters, field, page - 1, anchor) : undefined} nextHref={hasMore ? pageHref(filters, field, page + 1, anchor) : undefined} />;
}
function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const percent = total ? Math.round(completed / total * 100) : 0;
  return <div><div role="progressbar" aria-label="Bài học hoàn thành" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-2.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-gradient-to-r from-bkhn-red to-red-400" style={{ width: `${percent}%` }} /></div><p className="mt-2 flex justify-between text-xs font-bold text-gray-500"><span>{completed}/{total} bài hoàn thành</span><span className="text-bkhn-red">{percent}%</span></p></div>;
}
export default async function HealthDashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const query = Object.fromEntries(Object.entries(await searchParams).flatMap(([key, value]) => {
    const text = Array.isArray(value) ? value[0] : value;
    return text ? [[key, text]] : [];
  }));
  const parsed = healthFilterSchema.safeParse(query);
  if (!parsed.success) notFound();
  const data = await getAdminHealthDashboard(parsed.data);
  const { filters } = data;
  const badLinks = data.links.filter((link) => link.status === "BROKEN" || link.status === "BLOCKED").length;
  const chartStart = data.chart.length ? new Date(data.chart[0].createdAt).getTime() : 0;
  const chartEnd = data.chart.length ? new Date(data.chart.at(-1)!.createdAt).getTime() : 0;
  const points = data.chart.map((item) => ({ ...item, x: chartEnd === chartStart ? 300 : 40 + (new Date(item.createdAt).getTime() - chartStart) / (chartEnd - chartStart) * 520, y: 180 - item.score * 1.5 }));
  return <div className="mx-auto max-w-7xl space-y-6 animate-fade-up">
    <header className="rounded-[2rem] border border-bkhn-pink bg-gradient-to-br from-white to-bkhn-rose p-6 shadow-bkhn-sm sm:p-8"><div className="flex items-start gap-4"><span className="rounded-2xl bg-white p-3 text-bkhn-red ring-1 ring-bkhn-pink"><HeartPulse size={25} /></span><div><p className="text-xs font-black uppercase tracking-widest text-bkhn-red">Học sinh đang chọn · dữ liệu thực tế</p><h1 className="mt-2 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">Tiến trình & sức khỏe nội dung</h1><p className="mt-2 text-sm text-gray-500">{data.subject ? data.subject.title : "Toàn bộ lộ trình"} · Theo dõi việc học, bài tập và tài nguyên.</p></div></div></header>
    {data.subject && <SubjectViewNav courseId={data.subject.courseId} subjectId={data.subject.id} chapterId={filters.chapter} active="analytics" />}
    <HealthFilterForm key={JSON.stringify(filters)} data={{ filters, subjects: data.subjects, chapters: data.chapters, students: data.students }} />
    <nav aria-label="Các phần phân tích" className="sticky top-4 z-20 flex gap-1 overflow-x-auto rounded-2xl border border-bkhn-pink bg-white/95 p-2 shadow-sm backdrop-blur-md">{([ ["progress", "Tiến độ theo cụm"], ["activity", "Hoạt động & điểm"], ["links", "Thư viện link"], ["errors", "Nhật ký lỗi"] ] as const).map(([id, label]) => <Link key={id} href={tabHref(filters, id)} aria-current={filters.view === id ? "page" : undefined} className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold transition-colors ${filters.view === id ? "bg-bkhn-red text-white shadow-sm" : "text-gray-500 hover:bg-bkhn-rose hover:text-bkhn-red"}`}>{label}</Link>)}</nav>
    {filters.view === "progress" && <>
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border border-bkhn-pink bg-white p-5"><p className="text-xs font-bold uppercase text-gray-400">Học viên hiện tại</p><p className="mt-2 break-words font-black text-gray-900">{data.student ? data.student.name || data.student.email : "Chưa có học viên"}</p><p className="mt-2 text-xs text-gray-500">{data.student ? "Tiến độ bài học tính toàn thời gian." : "Báo cáo sẽ xuất hiện khi có hoạt động học thật."}</p><div className="mt-4"><ProgressBar {...data.progress} /></div></div>
      <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5"><Trophy size={22} className="text-amber-500" /><p className="mt-4 text-3xl font-black">{data.exerciseProgress.attempted}<span className="text-base text-gray-400">/{data.exerciseProgress.total}</span></p><p className="mt-1 text-sm font-bold text-gray-600">Bài có bài tập đã làm</p><p className="mt-2 text-xs text-gray-500">Trong khoảng thời gian đã chọn · bài tập trên web.</p></div>
      <div className="rounded-2xl border border-bkhn-pink bg-bkhn-rose/40 p-5"><p className="text-3xl font-black text-bkhn-red">{data.attemptCount}</p><p className="mt-2 text-sm font-bold text-gray-600">Lần làm bài</p><p className="mt-2 text-xs text-gray-500">Tổng trong khoảng đã chọn, gồm cả các trang lịch sử.</p></div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5"><p className="text-3xl font-black">{badLinks}<span className="text-base text-gray-400">/{data.links.length}</span></p><p className="mt-2 text-sm font-bold text-gray-600">Link cần kiểm tra</p><p className="mt-2 text-xs text-gray-500">{data.links.filter((link) => link.status === "UNKNOWN").length} link chưa quét.</p></div>
    </section>
    <section id="progress" className="scroll-mt-24 space-y-4"><div><h2 className="text-lg font-black text-gray-900">Tiến độ theo cụm</h2><p className="mt-1 text-xs leading-relaxed text-gray-500">Tính các bài đã xuất bản trong khóa học đã mở, gồm bài đang khóa theo lịch/thứ tự; loại bản nháp và bài nằm dưới cụm cha nháp. Hoàn thành do học viên tự đánh dấu, không phải thời lượng xem video. Cụm cha bao gồm cụm con.</p></div>
      <div className="grid gap-4 lg:grid-cols-2">{data.chapterProgress.map((chapter) => <article id={`chapter-${chapter.id}`} key={chapter.id} className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="font-black text-gray-900">{chapter.title}</h3><p className="mt-1 text-xs text-gray-400">{chapter.subjectTitle}</p></div><Link href={`/dashboard/health?view=progress&subject=${chapter.subjectId}&chapter=${chapter.id}&days=${filters.days}${data.student ? `&student=${data.student.id}` : ""}`} className="text-xs font-bold text-bkhn-red">Xem riêng →</Link></div><ProgressBar completed={chapter.completed} total={chapter.total} /><p className="mt-3 text-xs text-gray-500">Bài có bài tập đã làm: <b>{chapter.attempted}/{chapter.exercises}</b></p>{chapter.lessons.length > 0 && <details className="mt-3"><summary className="cursor-pointer text-xs font-bold text-bkhn-red">Chi tiết bài học & điểm</summary><div className="mt-3 space-y-2">{chapter.lessons.map((lesson) => <div key={lesson.id} className="rounded-xl bg-gray-50 p-3 text-xs"><p className="font-bold text-gray-800">{lesson.completed ? "✓ " : ""}<Link href={`/dashboard/lessons/${lesson.id}/analytics${data.student ? `?student=${data.student.id}` : ""}`} className="hover:text-bkhn-red hover:underline">{lesson.title} →</Link></p><p className="mt-1 text-gray-500">{lesson.questions ? `${lesson.attempts} lần làm · gần nhất ${lesson.latest ?? "—"}/100 · cao nhất ${lesson.best ?? "—"}/100` : "Không có bài tập tương tác"}</p></div>)}</div></details>}{!chapter.total && <p className="mt-3 text-xs text-gray-400">Chưa có bài thuộc lộ trình đã xuất bản.</p>}</article>)}</div>
      {!data.chapterProgress.length && <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-gray-400">Chưa có cụm trong phạm vi này.</p>}
    </section>
    </>}
    {filters.view === "activity" && <>
    <section id="activity" className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 font-black text-gray-900"><Trophy size={18} className="text-bkhn-red" />Diễn biến điểm bài tập</h2><p className="mt-1 text-xs text-gray-500">30 lần làm gần nhất trong khoảng đã chọn · thang điểm 100 · mỗi điểm là một lần nộp.</p>{points.length ? <><svg role="img" aria-label="Biểu đồ điểm theo thời gian. Chi tiết từng lần làm nằm trong lịch sử điểm bên dưới." viewBox="0 0 600 220" className="mt-4 max-h-64 w-full">{[0, 50, 100].map((score) => <g key={score}><line x1="40" x2="560" y1={180 - score * 1.5} y2={180 - score * 1.5} stroke="#e5e7eb" /><text x="5" y={184 - score * 1.5} fontSize="11" fill="#6b7280">{score}</text></g>)}<polyline points={points.map((item) => `${item.x},${item.y}`).join(" ")} fill="none" stroke="#c8102e" strokeWidth="2.5" />{points.map((item) => <circle key={item.id} cx={item.x} cy={item.y} r="4" fill="#c8102e"><title>{item.lesson.title} · {date(item.createdAt)} · {item.score}/100</title></circle>)}</svg><p className="flex justify-between gap-4 text-[11px] text-gray-400"><span>{date(points[0].createdAt)}</span><span>{date(points.at(-1)!.createdAt)}</span></p></> : <p className="py-10 text-center text-sm text-gray-400">Chưa có lần làm bài trong khoảng này.</p>}</section>
    <div className="grid gap-4 lg:grid-cols-2">
      <section id="timeline" className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-5"><h2 className="flex items-center gap-2 font-black"><Activity size={18} className="text-bkhn-red" />Timeline hoạt động</h2><div className="mt-4 space-y-2">{data.activities.map((item) => <div key={item.id} className="border-l-2 border-bkhn-pink py-2 pl-3"><p className="text-sm font-semibold">{activityLabel[item.type]} · {item.lesson.title}</p><p className="mt-1 text-xs text-gray-400">{date(item.createdAt)}</p></div>)}{!data.activities.length && <p className="py-8 text-center text-sm text-gray-400">Chưa có hoạt động trong trang này.</p>}</div><Pager filters={filters} field="activityPage" total={data.activityCount} anchor="timeline" /></section>
      <section id="scores" className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-5"><h2 className="font-black">Lịch sử điểm</h2><div className="mt-4 space-y-2">{data.attempts.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3"><div className="min-w-0"><p className="text-sm font-bold">{item.lesson.title}</p><p className="mt-1 text-xs text-gray-400">{date(item.createdAt)} · đúng {item.correctCount}/{item.totalQuestions}</p></div><strong className="shrink-0 text-lg text-bkhn-red">{item.score}<span className="text-xs font-medium text-gray-400">/100</span></strong></div>)}{!data.attempts.length && <p className="py-8 text-center text-sm text-gray-400">Chưa có lần làm bài trong trang này.</p>}</div><Pager filters={filters} field="attemptPage" total={data.attemptCount} anchor="scores" /></section>
    </div>
    </>}
    {filters.view === "links" && <LinkLibrary links={data.links} subjectId={filters.subject} chapterId={filters.chapter} />}
    {filters.view === "errors" && <section id="errors" className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-5"><h2 className="flex items-center gap-2 font-black"><AlertTriangle size={18} className="text-red-500" />Nhật ký lỗi</h2><p className="mt-1 text-xs text-gray-500">Gộp lỗi cùng bài, loại, nội dung và URL; sắp xếp theo lần gần nhất. Gồm lỗi máy chủ và báo lỗi từ học viên. Lỗi mất mạng chỉ gửi được khi kết nối trở lại.</p><div className="mt-4 space-y-3">{data.errors.map((item, index) => <article key={`${item.lessonId}:${index}`} className="flex flex-col gap-3 rounded-xl border border-red-100 bg-red-50/40 p-4 sm:flex-row sm:items-start"><span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-black text-red-600">{errorLabel[item.type]} · {item.count} lần</span><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold text-gray-800">{item.message}</p><p className="mt-1 text-xs text-gray-500">{item.lessonTitle} · gần nhất {date(item.createdAt)}</p>{item.resourceUrl && <p className="mt-1 break-all text-xs text-gray-400">{item.resourceUrl}</p>}</div><Link href={item.editHref} className="shrink-0 text-xs font-bold text-bkhn-red">Kiểm tra tại bài →</Link></article>)}{!data.errors.length && <p className="py-8 text-center text-sm text-gray-400">Chưa ghi nhận lỗi trong trang này.</p>}</div><Pager filters={filters} field="errorPage" more={data.hasMoreErrors} anchor="errors" /></section>}
  </div>;
}
