import Link from "next/link";
import { Eye, RotateCcw, X } from "lucide-react";
import { editorHref, previewQuery } from "@/features/courses/navigation";

export default function PreviewBanner({ courseId, subjectId, chapterId, studentName, showDrafts, simulated, unlock }: {
  courseId: string; subjectId: string; chapterId?: string | null; studentName: string | null;
  showDrafts: boolean; simulated: string[]; unlock?: string | null;
}) {
  return <aside aria-label="Chế độ Preview" className="sticky top-20 z-30 space-y-3 rounded-2xl border border-amber-200 bg-amber-50/95 p-4 shadow-sm backdrop-blur-md">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-2 text-amber-900"><Eye size={18} className="mt-0.5 shrink-0" /><div><p className="text-sm font-black">Đang xem như học viên</p><p className="mt-1 text-xs">{studentName ? `Tiến trình gốc: ${studentName}.` : "Chưa có học viên — bắt đầu với tiến trình trống."} Thao tác thử không lưu dữ liệu thật.</p></div></div><Link href={editorHref(courseId, subjectId, chapterId)} className="flex min-h-9 shrink-0 items-center gap-1 rounded-xl bg-white px-3 text-xs font-black text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100"><X size={14} />Thoát Preview</Link></div>
    <div className="flex flex-wrap items-center gap-3 border-t border-amber-200/60 pt-3 text-xs font-bold text-amber-800">
      <Link href={`/learn/subjects/${subjectId}${previewQuery({ showDrafts: !showDrafts, simulated })}`} className="rounded-lg bg-white px-3 py-2 ring-1 ring-amber-200">{showDrafts ? "Ẩn bản nháp · trở về góc nhìn học viên" : "Xem thêm bản nháp (Admin)"}</Link>
      {(simulated.length > 0 || unlock) && <Link href={`/learn/subjects/${subjectId}${previewQuery({ showDrafts })}`} className="flex items-center gap-1 rounded-lg px-2 py-2 hover:bg-amber-100"><RotateCcw size={13} />Tắt mở khóa tạm thời</Link>}
      {unlock && <span>Magic Unlock đang bật</span>}
      {showDrafts && <span>Phần bổ sung dành Admin; học viên không thấy bản nháp.</span>}
    </div>
  </aside>;
}
