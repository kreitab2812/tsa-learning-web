"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Report = { lessonId: string; type: "VIDEO_LOAD" | "DOCUMENT_LOAD" | "SUBMISSION"; message: string; resourceUrl: string | null };
export function useErrorReporter(lessonId: string, preview: boolean) {
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const queue = useRef<Report[]>([]);
  const sending = useRef(false);
  const flush = useCallback(async () => {
    if (sending.current || preview) return;
    sending.current = true;
    try {
      while (queue.current.length) {
        const response = await fetch("/api/learning/errors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(queue.current[0]) });
        if (!response.ok) {
          if (response.status >= 400 && response.status < 500) queue.current.shift();
          throw new Error("Report unavailable");
        }
        queue.current.shift();
        setReportMessage("Đã ghi nhận lỗi để quản trị viên kiểm tra.");
      }
    } catch { setReportMessage("Chưa gửi được báo lỗi. Giữ trang này mở; hệ thống sẽ thử lại khi có mạng hoặc sau một phút."); }
    finally { sending.current = false; }
  }, [preview]);
  useEffect(() => {
    if (preview) return;
    const retry = () => { if (queue.current.length) void flush(); };
    window.addEventListener("online", retry);
    const interval = setInterval(retry, 60000);
    return () => { window.removeEventListener("online", retry); clearInterval(interval); };
  }, [flush, preview]);
  async function reportError(type: Report["type"], message: string, resourceUrl?: string | null) {
    if (preview) { setReportMessage("Đã mô phỏng báo lỗi. Không ghi vào nhật ký học viên."); return; }
    const report = { lessonId, type, message, resourceUrl: resourceUrl || null };
    if (!queue.current.some((item) => JSON.stringify(item) === JSON.stringify(report))) queue.current = [...queue.current, report].slice(-5);
    await flush();
  }
  return { reportMessage, reportError };
}
