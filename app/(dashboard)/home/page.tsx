import Link from "next/link";
import { BookOpen, ChevronRight, GraduationCap } from "lucide-react";
import { listLearningCourses } from "@/server/learning/service";

export default async function HomePage() {
  const courses = await listLearningCourses();
  return <div className="mx-auto max-w-6xl space-y-8 animate-fade-up">
    <header className="rounded-3xl border border-bkhn-pink bg-gradient-to-br from-white to-bkhn-rose p-6 shadow-bkhn-sm sm:p-8">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-bkhn-red">Không gian học tập</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900">Lộ trình của bạn</h1>
      <p className="mt-2 text-sm text-gray-500">Chọn môn học để tiếp tục. Bài học, tài liệu và bài tập được sắp xếp theo lộ trình của bạn.</p>
    </header>
    {courses.length === 0 ? <div className="rounded-3xl border border-dashed border-bkhn-pink bg-white p-10 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-bkhn-rose text-bkhn-red"><BookOpen size={25} /></span><h2 className="mt-4 font-bold text-gray-800">Lộ trình đang được chuẩn bị</h2><p className="mt-2 text-sm text-gray-500">Khóa học sẽ xuất hiện tại đây khi được mở.</p></div> : courses.map((course) => <section key={course.id} className="rounded-[1.75rem] border border-bkhn-pink bg-white p-6 shadow-bkhn-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-bkhn-rose text-bkhn-red"><GraduationCap size={23} /></span>
        <div><h2 className="text-xl font-black text-gray-900">{course.title}</h2>{course.description && <p className="mt-1 text-sm text-gray-500">{course.description}</p>}</div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">{course.stages.flatMap((stage) => stage.subjects.map((subject) => <Link key={subject.id} href={`/learn/subjects/${subject.id}`} className="group flex items-center gap-3 rounded-2xl border border-gray-200 p-4 transition-all hover:border-bkhn-pink hover:bg-bkhn-rose/40 hover:shadow-bkhn-sm">
        <BookOpen size={18} className="shrink-0 text-bkhn-red" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-gray-800">{subject.title}</span><span className="mt-0.5 block text-xs text-gray-400">{stage.title}</span></span><ChevronRight size={17} className="text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-bkhn-red" />
      </Link>))}</div>
    </section>)}
  </div>;
}
