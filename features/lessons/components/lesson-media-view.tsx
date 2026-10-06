"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Columns2, FileText, GripVertical, PlayCircle, Maximize2, Minimize2 } from "lucide-react";
import type { VideoTracking } from "./youtube-watch-frame";
import MediaFrame, { type MediaErrorReporter } from "./media-frame";

export default function LessonMediaView({ title, videoUrl, documentUrl, splitView = true, watermark, onReport, tracking, focusMode = false, onFocusChange }: {
  title: string; videoUrl?: string | null; documentUrl?: string | null; splitView?: boolean;
  watermark?: string; onReport?: MediaErrorReporter; tracking?: VideoTracking;
  focusMode?: boolean; onFocusChange?: (focused: boolean) => void;
}) {
  const [mode, setMode] = useState<"both" | "video" | "pdf">(splitView ? "both" : videoUrl ? "video" : "pdf");
  const [ratio, setRatio] = useState(50), [dragging, setDragging] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null);
  const focusButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!focusMode || !root.current) return;
    const overflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    const siblings: { element: HTMLElement; inert: boolean }[] = [];
    // Keep the existing players mounted; isolate only the surrounding UI.
    let branch: HTMLElement = root.current;
    while (branch.parentElement) {
      for (const element of branch.parentElement.children) {
        if (element !== branch && element instanceof HTMLElement) {
          siblings.push({ element, inert: element.inert });
          element.inert = true;
        }
      }
      if (branch.parentElement === document.body) break;
      branch = branch.parentElement;
    }
    document.body.style.overflow = "hidden";
    focusButton.current?.focus({ preventScroll: true });
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onFocusChange?.(false); }
    };
    document.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = overflow;
      siblings.forEach(({ element, inert }) => { element.inert = inert; });
      document.removeEventListener("keydown", escape);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [focusMode, onFocusChange]);
  const both = !!videoUrl && !!documentUrl;
  const visible = both ? mode : videoUrl ? "video" : "pdf";
  const clamp = (value: number) => Math.max(25, Math.min(75, value));
  if (!videoUrl && !documentUrl) return <p className="rounded-2xl border border-dashed border-bkhn-pink bg-white p-8 text-center text-sm text-gray-500">Thêm video hoặc PDF để xem thử. Bước này có thể chỉ gồm tài liệu.</p>;
  return <section ref={root} role={focusMode ? "dialog" : undefined} aria-modal={focusMode || undefined} aria-label={focusMode ? `Tập trung học · ${title}` : title} className={focusMode ? "lesson-media-focus fixed inset-0 z-[80] m-0! flex h-dvh min-h-0 flex-col bg-gray-50" : "space-y-3"}>
    <div className={`flex shrink-0 flex-wrap items-center justify-between gap-2 ${focusMode ? "border-b border-bkhn-pink bg-white px-2 py-1.5 sm:px-3" : ""}`}><h2 className={focusMode ? "sr-only" : "text-sm font-black text-gray-900"}>{title}</h2>
      {both && <div aria-label="Chế độ hiển thị" className="flex gap-1 rounded-xl border border-bkhn-pink bg-white p-1 text-xs font-bold">
        {([{ key: "video", label: "Chỉ Video", Icon: PlayCircle }, { key: "pdf", label: "Chỉ PDF", Icon: FileText }, { key: "both", label: "Chia đôi", Icon: Columns2 }] as const).map(({ key, label, Icon }) => <button key={key} type="button" aria-pressed={visible === key} onClick={() => setMode(key)} className={`${key === "both" ? "hidden lg:flex" : "flex"} items-center gap-1.5 rounded-lg px-3 py-2 ${visible === key ? "bg-bkhn-red text-white" : "text-gray-500 hover:bg-bkhn-pale"}`}><Icon size={13} />{label}</button>)}
      </div>}
      {onFocusChange && <button ref={focusButton} type="button" aria-pressed={focusMode} onClick={() => onFocusChange(!focusMode)} title={focusMode ? "Hiện lại tiêu đề và điều hướng bài học" : "Ẩn giao diện phụ, mở rộng nội dung ra toàn tab"} className="ml-auto inline-flex min-h-9 shrink-0 items-center gap-2 rounded-xl border border-bkhn-pink bg-white px-3 py-2 text-xs font-bold text-bkhn-red hover:bg-bkhn-pale">
        {focusMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}{focusMode ? "Hiện giao diện" : "Tập trung học"}
      </button>}
    </div>
    <div ref={container} style={{ "--media-columns": `minmax(0, ${ratio}fr) 14px minmax(0, ${100 - ratio}fr)` } as CSSProperties} className={`grid min-w-0 grid-cols-1 ${focusMode ? "min-h-0 flex-1 grid-rows-[minmax(0,1fr)]" : ""} ${visible === "both" ? "lg:grid-cols-[var(--media-columns)]" : ""} ${dragging ? "select-none [&_iframe]:pointer-events-none" : ""}`}>
      {videoUrl && <div className={`${visible === "pdf" ? "hidden" : "block"} ${focusMode ? "h-full min-h-0" : "h-[65vh] min-h-[400px]"} min-w-0`}><MediaFrame url={videoUrl} kind="video" title="Video bài giảng" onReport={onReport} tracking={tracking} /></div>}
      {both && visible === "both" && <div role="separator" tabIndex={0} aria-label="Điều chỉnh độ rộng video và PDF" aria-orientation="vertical" aria-valuemin={25} aria-valuemax={75} aria-valuenow={Math.round(ratio)}
        onKeyDown={e => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) { e.preventDefault(); setRatio(value => e.key === "Home" ? 25 : e.key === "End" ? 75 : clamp(value + (e.key === "ArrowLeft" ? -5 : 5))); } }}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); }}
        onPointerMove={e => { if (!dragging || !container.current) return; const rect = container.current.getBoundingClientRect(); setRatio(clamp((e.clientX - rect.left) / rect.width * 100)); }}
        onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)} onLostPointerCapture={() => setDragging(false)}
        className="hidden touch-none cursor-col-resize items-center justify-center rounded-lg text-gray-400 hover:bg-bkhn-pink focus:bg-bkhn-pink focus:outline-none lg:flex"><GripVertical size={14} /></div>}
      {documentUrl && <div className={`${visible === "video" ? "hidden" : visible === "both" ? "hidden lg:block" : "block"} ${focusMode ? "h-full min-h-0" : "h-[65vh] min-h-[400px]"} min-w-0`}><MediaFrame url={documentUrl} kind="pdf" title="Tài liệu đi kèm" watermark={watermark} onReport={onReport} /></div>}
    </div>
    {both && <p className={focusMode ? "sr-only" : "text-[11px] text-gray-500"}>Chọn một bên để xem rộng hơn; trên máy tính có thể kéo vách giữa hoặc dùng phím mũi tên. Ẩn video không dừng âm thanh.</p>}
  </section>;
}
