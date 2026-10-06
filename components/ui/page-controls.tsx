import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import NavigationPending from "./navigation-pending";

export default function PageControls({ page, previousHref, nextHref, totalPages, label }: {
  page: number; previousHref?: string; nextHref?: string; totalPages?: number; label?: string;
}) {
  return <nav aria-label="Phân trang báo cáo" className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
    <p className="text-xs font-medium text-gray-500">{label ?? "Lịch sử hoạt động"}</p>
    <div className="flex items-center gap-1.5">
      {previousHref ? <Link href={previousHref} prefetch={false} className="pagination-button relative" aria-label="Trang trước"><ChevronLeft size={16} />Trước<NavigationPending /></Link> : <span aria-disabled="true" className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-gray-100 bg-gray-50 px-3 text-xs font-bold text-gray-300"><ChevronLeft size={16} />Trước</span>}
      <span aria-current="page" className="rounded-xl bg-bkhn-rose px-3 py-3 text-xs font-black tabular-nums text-bkhn-red">{page}{totalPages !== undefined && <span className="ml-1 font-medium text-gray-500">/ {totalPages}</span>}</span>
      {nextHref ? <Link href={nextHref} prefetch={false} className="pagination-button relative" aria-label="Trang sau">Tiếp<ChevronRight size={16} /><NavigationPending /></Link> : <span aria-disabled="true" className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-gray-100 bg-gray-50 px-3 text-xs font-bold text-gray-300">Tiếp<ChevronRight size={16} /></span>}
    </div>
  </nav>;
}
