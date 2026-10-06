import { Loader2 } from "lucide-react";

export function LoadingIndicator({ label = "Đang cập nhật…" }: { label?: string }) {
  return <div role="status" className="flex items-center gap-2 rounded-xl border border-bkhn-pink bg-bkhn-rose px-4 py-3 text-xs font-semibold text-bkhn-red"><Loader2 size={15} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />{label}</div>;
}

export default function LoadingState({ label = "Đang tải nội dung…", compact = false }: { label?: string; compact?: boolean }) {
  return <section role="status" aria-label={label} className="mx-auto w-full max-w-7xl space-y-4">
    <p className="flex items-center gap-2 text-sm font-semibold text-gray-500"><Loader2 size={17} aria-hidden="true" className="animate-spin text-bkhn-red motion-reduce:animate-none" />{label}</p>
    <div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">
      {!compact && <div className="space-y-4 rounded-3xl border border-bkhn-pink bg-white p-6"><div className="h-3 w-24 rounded bg-bkhn-pink/70" /><div className="h-7 w-2/3 max-w-sm rounded-lg bg-gray-100" /><div className="h-3 w-3/4 rounded bg-gray-100" /></div>}
      <div className={`grid gap-4 ${compact ? "" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        {[0, 1, 2].map(index => <div key={index} className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5"><div className="h-8 w-10 rounded-lg bg-bkhn-rose" /><div className="h-4 w-2/3 rounded bg-gray-100" /><div className="h-3 w-full rounded bg-gray-50" /><div className="h-3 w-1/2 rounded bg-gray-50" /></div>)}
      </div>
    </div>
  </section>;
}
