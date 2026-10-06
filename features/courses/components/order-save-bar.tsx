"use client";
import { ListOrdered, Loader2, RotateCcw, Save } from "lucide-react";

export default function OrderSaveBar({ count, saving, error, onCancel, onSave }: {
  count: number; saving: boolean; error: string | null; onCancel: () => void; onSave: () => void;
}) {
  if (!count) return null;
  return <section aria-label="Thứ tự chưa lưu" className="animate-fade-up fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-3xl overflow-hidden rounded-[1.5rem] border border-bkhn-pink bg-white/95 shadow-bkhn-lg ring-4 ring-bkhn-red/5 backdrop-blur-md sm:bottom-6">
    <div className="h-1 bg-gradient-to-r from-bkhn-red via-red-500 to-amber-400" />
    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-bkhn-pink bg-bkhn-rose text-bkhn-red shadow-bkhn-sm">
          <ListOrdered size={19} strokeWidth={2.5} />
        </span>
        <div className="min-w-0">
          <p role="status" className="font-black tracking-tight text-gray-900">Thứ tự chưa được lưu</p>
          <p className="mt-0.5 text-xs font-medium leading-relaxed text-gray-500">
            Đã thay đổi {count} nhóm. Hãy lưu hoặc hủy trước khi sửa nội dung.
          </p>
        </div>
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
        <button disabled={saving} onClick={onCancel} className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 shadow-sm transition-all hover:border-bkhn-pink hover:bg-bkhn-rose hover:text-bkhn-red disabled:cursor-not-allowed disabled:opacity-50">
          <RotateCcw size={15} /> Hủy bỏ
        </button>
        <button disabled={saving} onClick={onSave} className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-bkhn-red px-4 py-2 text-sm font-black text-white shadow-bkhn-md transition-all hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-bkhn-glow disabled:cursor-wait disabled:translate-y-0 disabled:opacity-60">
          {saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
          {saving ? "Đang lưu…" : "Lưu thứ tự"}
        </button>
      </div>
    </div>
    {error && <p role="alert" className="border-t border-red-100 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-700">{error}</p>}
  </section>;
}
