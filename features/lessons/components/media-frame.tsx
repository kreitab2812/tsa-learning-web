"use client";
import { useEffect, useState } from "react";
import YoutubeWatchFrame, { type VideoTracking } from "./youtube-watch-frame";
import { ExternalLink, Loader2, RotateCcw } from "lucide-react";
import { getDrivePreviewUrl, getYoutubeEmbedUrl, safeResourceUrl } from "@/lib/media";

export type MediaErrorReporter = (type: "VIDEO_LOAD" | "DOCUMENT_LOAD", message: string, url: string) => void;

export default function MediaFrame({ url, kind, title, watermark, onReport, tracking }: {
  url: string; kind: "video" | "pdf"; title: string; watermark?: string; onReport?: MediaErrorReporter; tracking?: VideoTracking;
}) {
  const [version, setVersion] = useState(0);
  const embed = kind === "video" ? getYoutubeEmbedUrl(url) : getDrivePreviewUrl(url);
  const source = safeResourceUrl(url);
  return <div data-media-frame className="flex h-full min-h-[360px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
    <div data-media-chrome className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-3 py-2.5">
      <h3 className="text-xs font-bold text-gray-800">{title}</h3>
      <div className="flex items-center gap-3 text-[11px] font-bold text-bkhn-red">
        <button type="button" onClick={() => setVersion(value => value + 1)} className="flex min-h-8 items-center gap-1"><RotateCcw size={12} />Thử lại</button>
        {source && <a href={source} target="_blank" rel="noreferrer" className="flex min-h-8 items-center gap-1">Mở nguồn<ExternalLink size={12} /></a>}
      </div>
    </div>
    {embed && kind === "video" && tracking ? <YoutubeWatchFrame key={`${embed}:${version}`} src={embed} url={url} title={title} tracking={tracking} onReport={onReport} /> : embed ? <EmbeddedFrame key={`${embed}:${version}`} src={embed} title={title} kind={kind} watermark={watermark} /> : <div className="flex flex-1 items-center justify-center bg-gray-50 p-6 text-center text-sm leading-relaxed text-gray-500">Không thể nhúng nguồn này. {kind === "pdf" ? "Hãy dùng link tệp PDF Google Drive hoặc mở tài liệu tại nguồn." : "Hãy kiểm tra link YouTube hoặc mở video tại nguồn."}</div>}
    <div data-media-chrome className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-3 py-2 text-[10px] leading-relaxed text-gray-500">
      <span>{kind === "pdf" ? "Drive kiểm tra quyền xem. Nếu bị từ chối, mở nguồn và đăng nhập đúng tài khoản Google." : "Nếu video bị chặn nhúng, hãy mở nguồn YouTube."}</span>
      {onReport && <button type="button" onClick={() => onReport(kind === "video" ? "VIDEO_LOAD" : "DOCUMENT_LOAD", `Không xem được ${title.toLocaleLowerCase("vi-VN")}.`, url)} className="shrink-0 font-bold text-red-600">Báo lỗi nội dung</button>}
    </div>
  </div>;
}

function EmbeddedFrame({ src, title, kind, watermark }: { src: string; title: string; kind: "video" | "pdf"; watermark?: string }) {
  const [loaded, setLoaded] = useState(false), [slow, setSlow] = useState(false), [failed, setFailed] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 15000);
    return () => window.clearTimeout(timer);
  }, []);
  return <div data-media-surface className="relative min-h-[300px] flex-1 bg-gray-50">
    {!loaded && !failed && <div role="status" className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-center gap-2 rounded-xl bg-white/95 p-3 text-xs text-gray-600 shadow-sm"><Loader2 size={14} className="animate-spin" />{slow ? "Nguồn tải chậm. Cậu có thể thử lại hoặc mở tại nguồn." : "Đang mở nội dung…"}</div>}
    {failed && <p role="alert" className="absolute inset-x-3 top-3 z-10 rounded-xl bg-red-50 p-3 text-xs text-red-700">Không tải được khung xem. Thử lại hoặc mở tại nguồn.</p>}
    <iframe src={src} title={title} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} className="absolute inset-0 h-full w-full border-0" allow={kind === "video" ? "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" : undefined} allowFullScreen={kind === "video"} referrerPolicy="strict-origin-when-cross-origin" />
    {watermark && kind === "pdf" && <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-around overflow-hidden px-2 text-center text-xs font-bold text-gray-500/35">{[0, 1, 2].map(index => <span key={index} className="-rotate-12 break-all">{watermark} · TSA Learning</span>)}</div>}
  </div>;
}
