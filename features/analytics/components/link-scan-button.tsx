"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ScanSearch } from "lucide-react";

export default function LinkScanButton({ subjectId, chapterId, lessonId, kind }: { subjectId?: string; chapterId?: string; lessonId?: string; kind?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function scan() {
    if (pending) return;
    setPending(true); setMessage(null);
    try {
      const response = await fetch("/api/admin/links/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: kind ? 1 : 20, subjectId, chapterId, lessonId, kind }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Không thể quét link.");
      const result = data.result;
      setMessage(`Đã quét ${result.scanned} link · ${result.healthy} truy cập được · ${result.broken} không truy cập được · ${result.blocked} cần kiểm tra quyền/giới hạn`);
      router.refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Không thể quét link."); }
    finally { setPending(false); }
  }
  return <div className="flex flex-col items-end gap-1.5"><button onClick={() => void scan()} disabled={pending} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-60 ${kind ? "bg-gray-100 text-gray-700 hover:bg-bkhn-rose" : "bg-bkhn-red text-white shadow-bkhn-sm hover:bg-red-700"}`}>{pending ? <Loader2 size={14} className="animate-spin" /> : <ScanSearch size={14} />} {pending ? "Đang quét…" : kind ? "Quét lại" : "Quét tối đa 20 link"}</button>{message && <p role="status" className="max-w-xs text-right text-xs font-semibold text-gray-500">{message}</p>}</div>;
}
