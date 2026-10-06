import { CircleAlert, RotateCcw } from "lucide-react";
export default function RequestError({ message, retry }: { message: string | null; retry?: () => void }) {
  if (!message) return null;
  return <div role="alert" className="my-3 flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-red-800">
    <CircleAlert size={18} className="shrink-0" aria-hidden="true" /><p className="min-w-0 flex-1 basis-48 text-sm leading-6">{message}</p>{retry && <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-xs font-bold hover:bg-red-50" onClick={retry}><RotateCcw size={14} />Thử lại</button>}
  </div>;
}
