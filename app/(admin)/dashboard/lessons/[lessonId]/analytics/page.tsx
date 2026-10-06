import Link from "next/link";
import PageControls from "@/components/ui/page-controls";
import { notFound } from "next/navigation";
import { z } from "zod";
import { BarChart3, CheckCircle2, Circle, Film, AlertTriangle } from "lucide-react";
import { requireAdmin } from "@/server/auth/session";
import { getLessonAnalytics } from "@/server/admin/lesson-analytics";
import { LEARNING_STEPS } from "@/features/learning/quiz-session";
import QuizContent from "@/features/lessons/components/quiz-content";
import LinkLibrary from "@/features/analytics/components/link-library";

const date = (value: Date) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(value);
const card = "rounded-2xl border border-bkhn-pink bg-white p-5 shadow-bkhn-sm";
const labels = { VIDEO_LOAD: "Video", DOCUMENT_LOAD: "Tài liệu / tải xuống", SUBMISSION: "Nộp bài" };

export default async function LessonAnalyticsPage({ params, searchParams }: {
  params: Promise<{ lessonId: string }>; searchParams: Promise<{ page?: string; student?: string }>;
}) {
  await requireAdmin();
  const id = z.uuid().safeParse((await params).lessonId);
  if (!id.success) notFound();
  const query = await searchParams;
  const page = z.coerce.number().int().min(1).max(10000).catch(1).parse(query.page ?? 1);
  const studentId = query.student ? z.uuid().safeParse(query.student) : null;
  if (studentId && !studentId.success) notFound();
  const data = await getLessonAnalytics(id.data, page, studentId?.data);
  if (!data) notFound();
  const { lesson, student, run } = data;
  const base = `/dashboard/lessons/${lesson.id}`;
  const studentQuery = student ? `&student=${student.id}` : "";
  const health = `/dashboard/health?view=progress&subject=${lesson.subjectId}&chapter=${lesson.chapterId}${studentQuery}`;
  return <div className="mx-auto max-w-7xl space-y-5 pb-10 animate-fade-up">
    <header className="rounded-3xl border border-bkhn-pink bg-gradient-to-br from-white to-bkhn-rose p-6 sm:p-8">
      <Link href={health} className="text-xs font-bold text-bkhn-red">← Tiến trình cụm & Health</Link>
      <p className="mt-5 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-bkhn-red"><BarChart3 size={17} />Analytics bài học</p>
      <h1 className="mt-2 text-2xl font-black text-gray-900">{lesson.title}</h1>
      <p className="mt-2 text-sm text-gray-500">{student ? student.name || student.email : "Chưa có học viên"} · Chỉ dữ liệu học thật. Preview không được cộng vào báo cáo.</p>
      <nav className="mt-5 flex flex-wrap gap-2 text-xs font-bold" aria-label="Các góc nhìn bài học"><Link href={`${base}/questions`} className="rounded-xl bg-white px-4 py-2.5 text-gray-600">Chỉnh sửa</Link><span className="rounded-xl bg-bkhn-red px-4 py-2.5 text-white">Analytics</span></nav>
    </header>
    <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-black">Tiến trình các phần học</h2><span className="text-sm font-bold text-bkhn-red">{run ? `${run.completedSteps.filter(step => data.availableSteps.includes(step)).length}/${data.availableSteps.length} phần` : "Chưa có dữ liệu từng bước"} · {data.progress?.isCompleted ? "Bài đã hoàn thành" : "Bài chưa hoàn thành"}</span></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{data.availableSteps.map((index) => {
        const title = LEARNING_STEPS[index];
        const done = run?.completedSteps.includes(index), current = run?.currentStep === index;
        return <article key={title} className={`rounded-xl border p-4 ${done ? "border-green-200 bg-green-50/50" : current ? "border-bkhn-pink bg-bkhn-rose/40" : "border-gray-100 bg-gray-50"}`}>
          {done ? <CheckCircle2 size={20} className="text-green-600" /> : <Circle size={20} className={current ? "text-bkhn-red" : "text-gray-300"} />}
          <h3 className="mt-3 text-sm font-bold">{index + 1}. {title}</h3><p className="mt-1 text-xs text-gray-500">{done ? "Đã hoàn thành bước" : current ? "Bước tiếp tục đã lưu" : "Chưa ghi nhận hoàn thành"}</p>
        </article>;
      })}</div>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">Hoàn thành bước không đồng nghĩa xem hết video. {run ? `Cập nhật: ${date(run.updatedAt)}.` : "Lần học cũ không có dấu từng bước sẽ không được tự suy diễn."}</p>
    </section>
    <section className="grid gap-4 md:grid-cols-2">{data.videos.map(video => {
      const measured = video.seconds !== null && video.duration !== null;
      const percent = measured ? Math.min(100, Math.floor(video.seconds! / video.duration! * 100)) : null;
      return <article key={video.section} className={card}><h2 className="flex items-center gap-2 font-black"><Film size={18} className="text-bkhn-red" />Video {video.section === "THEORY" ? "lý thuyết" : "thực hành"}</h2>
        <p className="mt-4 text-2xl font-black text-bkhn-red">{percent !== null ? `≈ ${percent}%` : "—"}</p>
        <p className="mt-2 text-sm text-gray-600">{!video.configured ? "Bước này không có video." : !video.supported ? "Nguồn chưa hỗ trợ đo mức xem." : !measured ? "Chưa nhận dữ liệu phát từ YouTube." : `${Math.floor(video.seconds!)} / ${Math.round(video.duration!)} giây nội dung được ghi nhận.`}</p>
        {percent !== null && <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-bkhn-red" style={{ width: `${percent}%` }} /></div>}
        <p className="mt-3 text-xs leading-relaxed text-gray-400">Ước tính từ đoạn phát trong web, không cộng lặp đoạn xem lại hoặc khoảng tua qua. Không đo việc xem ngoài YouTube hay sự tập trung. Mất mạng/đóng trang có thể thiếu mẫu.{video.updatedAt && ` Cập nhật: ${date(video.updatedAt)}.`}</p>
      </article>;
    })}</section>
    <section id="scores" className={card}><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-black">Lịch sử điểm · {data.count} lần làm thật</h2><span className="text-xs text-gray-500">Thang điểm 100</span></div>
      <div className="mt-4 space-y-2">{data.history.map(item => <article key={item.id} className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 p-4"><div><p className="text-sm font-bold">{date(item.createdAt)}</p><p className="mt-1 text-xs text-gray-500">Đúng {item.correctCount}/{item.totalQuestions} câu · {item.sessionId ? "Có bản chụp đề" : "Lịch sử cũ, chưa có bản chụp"}</p></div><strong className="text-xl text-bkhn-red">{item.score}<span className="text-xs text-gray-400">/100</span></strong></article>)}{!data.history.length && <p className="py-6 text-center text-sm text-gray-400">Chưa có lần làm trong trang này.</p>}</div>
      <PageControls page={page} label={`${data.count} lần làm thật`} totalPages={Math.max(1, Math.ceil(data.count / 20))} previousHref={page > 1 ? `${base}/analytics?page=${page - 1}${student ? `&student=${student.id}` : ""}#scores` : undefined} nextHref={page * 20 < data.count ? `${base}/analytics?page=${page + 1}${student ? `&student=${student.id}` : ""}#scores` : undefined} />
    </section>
    <section className={card}><h2 className="font-black">Các câu thường sai</h2><p className="mt-2 text-xs leading-relaxed text-gray-500">Tính trên {data.mistakes.included}/{data.sampleCount} lần làm gần nhất có bản chụp (tối đa 200 lần). Bỏ qua lần cũ thiếu bản chụp; câu bỏ trống được tính sai. Mỗi phiên bản đề/đáp án tính riêng, không phải tỷ lệ của nhiều học viên.</p>
      <div className="mt-4 space-y-3">{data.mistakes.questions.slice(0, 20).map((item, index) => <article key={item.key} className="rounded-xl border border-gray-100 p-4"><div className="mb-3 flex flex-wrap justify-between gap-2"><span className="text-xs font-bold text-gray-400">#{index + 1} · Bản chụp {item.key.split(":")[1].slice(0, 6)}</span><strong className="rounded-full bg-red-50 px-3 py-1 text-xs text-red-700">Sai {item.wrong}/{item.total} lần làm</strong></div><QuizContent text={item.content} />{item.imageUrl && <a href={item.imageUrl} target="_blank" rel="noreferrer" className="mt-2 block text-xs text-bkhn-red">Xem ảnh trong bản chụp ↗</a>}</article>)}</div>
      {!data.mistakes.questions.length && <p className="py-6 text-center text-sm text-gray-400">{data.mistakes.included ? "Không có câu sai trong các bản chụp được thống kê." : "Chưa đủ dữ liệu bản chụp để thống kê câu sai."}</p>}
      {data.mistakes.questions.length > 20 && <p className="mt-3 text-xs text-gray-400">Hiển thị 20 phiên bản câu có số lần sai cao nhất.</p>}
    </section>
    <LinkLibrary links={data.links} lessonId={lesson.id} />
    <section className={card}><h2 className="flex items-center gap-2 font-black"><AlertTriangle size={18} className="text-red-500" />Lỗi trong bài học</h2><p className="mt-2 text-xs text-gray-500">20 lỗi thật gần nhất của học viên · Không gồm mô phỏng Preview.</p><div className="mt-4 space-y-3">{data.errors.map(item => <article key={item.id} className="rounded-xl border border-red-100 bg-red-50/30 p-4"><p className="text-xs font-bold text-red-600">{labels[item.type]} · {date(item.createdAt)}</p><p className="mt-2 break-words text-sm">{item.message}</p>{item.resourceUrl && <p className="mt-1 break-all text-xs text-gray-500">{item.resourceUrl}</p>}<Link href={item.editHref} className="mt-3 inline-block text-xs font-bold text-bkhn-red">Kiểm tra đúng chỗ sửa →</Link></article>)}</div>{!data.errors.length && <p className="py-6 text-center text-sm text-gray-400">Chưa ghi nhận lỗi.</p>}<Link href={`${health}#errors`} className="mt-4 inline-block text-xs font-bold text-bkhn-red">Nhật ký Health & bộ lọc →</Link></section>
  </div>;
}
