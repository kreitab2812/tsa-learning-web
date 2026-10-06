import Link from "next/link";
import { BarChart3, Pencil } from "lucide-react";
import { editorHref } from "../navigation";

export default function SubjectViewNav({ courseId, subjectId, chapterId, active, showAnalytics = true }: {
  courseId: string; subjectId: string; chapterId?: string | null; active: "edit" | "preview" | "analytics";
  showAnalytics?: boolean;
}) {
  const scope = new URLSearchParams({ subject: subjectId });
  if (chapterId) scope.set("chapter", chapterId);
  return <nav aria-label="Chế độ xem môn học" className="flex flex-wrap gap-1 rounded-2xl border border-bkhn-pink bg-white p-1.5 shadow-bkhn-sm">
    {[
      { key: "edit", label: "Chỉnh sửa", icon: Pencil, href: editorHref(courseId, subjectId, chapterId) },
      { key: "analytics", label: "Tiến trình & sức khỏe", icon: BarChart3, href: `/dashboard/health?${scope}` },
    ].filter(item => showAnalytics || item.key !== "analytics").map(({ key, label, icon: Icon, href }) => <Link key={key} href={href} prefetch={false} aria-current={active === key ? "page" : undefined} className={`flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors sm:px-4 ${active === key ? "bg-bkhn-red text-white shadow-sm" : "text-gray-500 hover:bg-bkhn-rose hover:text-bkhn-red"}`}><Icon size={15} />{label}</Link>)}
  </nav>;
}
