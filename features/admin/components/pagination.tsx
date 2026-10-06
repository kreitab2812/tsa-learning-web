import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

export default function Pagination({ page, hasMore, busy, onChange, itemCount, itemLabel = "mục", pageSize = 20, totalPages }: {
  page: number; hasMore: boolean; busy: boolean; onChange: (page: number) => void;
  itemCount?: number; itemLabel?: string; pageSize?: number; totalPages?: number;
}) {
  const first = (page - 1) * pageSize + 1;
  return <nav aria-label={`Phân trang ${itemLabel}`} aria-busy={busy} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-bkhn-pink bg-white px-4 py-3 shadow-bkhn-sm">
    <div className="min-w-0 text-xs">
      <p className="font-bold text-gray-800">{itemCount !== undefined && itemCount > 0 ? `${first}–${first + itemCount - 1} ${itemLabel}` : `Danh sách ${itemLabel}`}</p>
      <p role="status" aria-live="polite" className="mt-1 flex min-h-4 items-center gap-1.5 text-[11px] text-gray-500">{busy ? <><Loader2 size={12} className="animate-spin motion-reduce:animate-none" />Đang tải trang {page}…</> : !itemCount && itemCount !== undefined ? "Chưa có nội dung trong trang này" : `${pageSize} ${itemLabel} mỗi trang`}</p>
    </div>
    <div className="flex items-center gap-1.5">
      <button type="button" aria-label="Trang trước" disabled={busy || page <= 1} onClick={() => onChange(page - 1)} className="pagination-button"><ChevronLeft size={16} aria-hidden="true" /><span className="hidden min-[380px]:inline">Trước</span></button>
      <span aria-current="page" className="flex h-10 min-w-16 items-center justify-center rounded-xl bg-bkhn-rose px-3 text-xs font-black tabular-nums text-bkhn-red">{page}{totalPages !== undefined && <span className="ml-1 font-medium text-gray-500">/ {totalPages}</span>}<span className="sr-only"> · Trang hiện tại</span></span>
      <button type="button" aria-label="Trang sau" disabled={busy || !hasMore} onClick={() => onChange(page + 1)} className="pagination-button"><span className="hidden min-[380px]:inline">Tiếp</span><ChevronRight size={16} aria-hidden="true" /></button>
    </div>
  </nav>;
}
