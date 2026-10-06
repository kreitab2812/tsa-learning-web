import Link from "next/link";
import { ArrowUpRight, BookOpen, Layers3, LibraryBig, ListChecks, HeartPulse, Settings2, ChevronRight, FolderOpen } from "lucide-react";

type Summary = { courses: number; subjects: number; lessons: number; questions: number };
export default function AdminOverview({ summary }: { summary: Summary }) {
  const stats = [
    { label: "Khóa học", value: summary.courses, icon: LibraryBig, detail: "Lộ trình đã tạo" },
    { label: "Môn học", value: summary.subjects, icon: Layers3, detail: "Trong các giai đoạn" },
    { label: "Bài học", value: summary.lessons, icon: BookOpen, detail: "Gồm bản nháp & xuất bản" },
    { label: "Câu hỏi", value: summary.questions, icon: ListChecks, detail: "Trong các bài tập" },
  ];
  return <div className="mx-auto max-w-7xl space-y-6 pb-8 animate-fade-up">
    <header className="relative overflow-hidden rounded-3xl border border-bkhn-pink bg-white p-6 shadow-bkhn-sm sm:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full bg-bkhn-rose" />
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-xl"><p className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-bkhn-red"><span className="h-1.5 w-1.5 rounded-full bg-bkhn-red" />Không gian quản lý</p><h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">Tổng quan nội dung</h1><p className="mt-3 text-sm leading-6 text-gray-500">Một nơi để tổ chức lộ trình, chăm chút từng bài học và theo dõi việc học.</p></div>
        <Link href="/dashboard/courses" className="inline-flex min-h-11 items-center gap-3 rounded-xl bg-bkhn-red px-5 py-3 text-sm font-bold text-white shadow-bkhn-md transition-colors hover:bg-red-700">Quản lý khóa học<ArrowUpRight size={17} /></Link>
      </div>
    </header>
    <section aria-label="Thống kê nội dung" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, detail }) => <article key={label} className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-bkhn-sm sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xs font-semibold text-gray-500">{label}</h2><span className="rounded-xl bg-bkhn-rose p-2 text-bkhn-red"><Icon size={18} strokeWidth={1.8} /></span></div><p className="mt-3 text-3xl font-black tracking-tight tabular-nums text-gray-900">{value.toLocaleString("vi-VN")}</p><p className="mt-2 text-[11px] leading-5 text-gray-500">{detail}</p></article>)}
    </section>
    <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <article className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-bkhn-sm sm:p-7">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-bkhn-red">Nội dung & lộ trình</p>
        <h2 className="mt-2 text-xl font-black tracking-tight text-gray-900">{summary.courses ? "Tiếp tục xây dựng bài học" : "Bắt đầu với khóa học đầu tiên"}</h2>
        <p className="mt-3 text-sm leading-6 text-gray-500">{summary.courses ? "Mở khóa học để sắp xếp cụm kiến thức, soạn nội dung và xem thử trải nghiệm học viên." : "Tạo khóa học, chia giai đoạn và thêm môn học. Nội dung có thể được giữ ở bản nháp đến khi sẵn sàng."}</p>
        <div className="mt-6 space-y-3">{[
          { title: "Tổ chức lộ trình", text: "Khóa học → Giai đoạn → Môn học → Cụm kiến thức", icon: FolderOpen },
          { title: "Hoàn thiện từng bài", text: "Lý thuyết, thực hành, tài liệu và bài tập", icon: BookOpen },
          { title: "Kiểm tra trước khi xuất bản", text: "Rà soát nội dung, tài liệu và quy tắc hoàn thành", icon: ListChecks },
        ].map(({ title, text, icon: Icon }) => <div key={title} className="flex gap-3 rounded-2xl bg-gray-50/80 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-white text-bkhn-red"><Icon size={17} /></span><div><h3 className="text-sm font-bold text-gray-800">{title}</h3><p className="mt-1 text-xs leading-5 text-gray-500">{text}</p></div></div>)}</div>
        <Link href="/dashboard/courses" className="mt-6 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-bkhn-red">{summary.courses ? "Đến danh sách khóa học" : "Tạo nội dung đầu tiên"}<ChevronRight size={16} /></Link>
      </article>
      <div className="space-y-4">
        <h2 className="px-1 text-sm font-black text-gray-800">Truy cập nhanh</h2>
        <Link href="/dashboard/health" prefetch={false} className="group flex items-start gap-4 rounded-2xl border border-bkhn-pink bg-bkhn-rose/70 p-5 transition-colors hover:bg-bkhn-pale"><span className="rounded-xl bg-white p-3 text-bkhn-red"><HeartPulse size={21} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-black text-gray-900">Tiến trình & sức khỏe</span><span className="mt-2 block text-xs leading-5 text-gray-600">Tiến trình học thật, lịch sử điểm, tài nguyên và nhật ký lỗi.</span></span><ArrowUpRight size={17} className="shrink-0 text-bkhn-red" /></Link>
        <Link href="/dashboard/settings" className="flex items-start gap-4 rounded-2xl border border-gray-200/80 bg-white p-5 transition-colors hover:border-bkhn-pink"><span className="rounded-xl bg-gray-50 p-3 text-gray-500"><Settings2 size={21} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-black text-gray-900">Tài khoản quản trị</span><span className="mt-2 block text-xs leading-5 text-gray-500">Thông tin tài khoản và thiết lập mật khẩu.</span></span><ArrowUpRight size={17} className="shrink-0 text-gray-400" /></Link>
        <p className="px-2 text-[11px] leading-5 text-gray-400">Thống kê nội dung gồm cả bản nháp. Tiến trình học và Preview được tách riêng trong báo cáo.</p>
      </div>
    </section>
  </div>;
}
