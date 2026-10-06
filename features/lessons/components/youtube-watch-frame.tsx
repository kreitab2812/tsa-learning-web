"use client";
import { useEffect, useRef, useState } from "react";
import { playedInterval, type WatchRange } from "@/features/analytics/video-progress";
import type { MediaErrorReporter } from "./media-frame";

export type VideoTracking = { lessonId: string; section: "THEORY" | "PRACTICE" };
type Player = { getCurrentTime(): number; getDuration(): number; getPlayerState(): number; getPlaybackRate(): number; destroy(): void };
type YoutubeAPI = { Player: new (element: HTMLElement, options: { events: { onReady(): void; onStateChange(): void; onError(): void } }) => Player };
type YoutubeWindow = Window & { YT?: YoutubeAPI; onYouTubeIframeAPIReady?: () => void };
let loading: Promise<YoutubeAPI> | null = null;
function loadYoutube() {
  const host = window as YoutubeWindow;
  if (host.YT?.Player) return Promise.resolve(host.YT);
  if (loading) return loading;
  loading = new Promise<YoutubeAPI>((resolve, reject) => {
    const script = document.createElement("script");
    const previous = host.onYouTubeIframeAPIReady;
    const timer = window.setTimeout(() => reject(new Error("YouTube API timeout")), 20000);
    host.onYouTubeIframeAPIReady = () => { previous?.(); clearTimeout(timer); if (host.YT) resolve(host.YT); };
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = () => { clearTimeout(timer); reject(new Error("YouTube API unavailable")); };
    document.head.append(script);
  }).catch(error => { loading = null; throw error; });
  return loading;
}

export default function YoutubeWatchFrame({ src, url, title, tracking, onReport }: {
  src: string; url: string; title: string; tracking: VideoTracking; onReport?: MediaErrorReporter;
}) {
  const container = useRef<HTMLDivElement>(null);
  const reporter = useRef(onReport);
  const [status, setStatus] = useState("Đang kết nối bộ đo mức xem YouTube…");
  useEffect(() => { reporter.current = onReport; }, [onReport]);
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    let cancelled = false, player: Player | undefined, sending = false;
    let previous: { time: number; wall: number; rate: number } | null = null;
    const queue: WatchRange[] = [];
    let duration = 0;
    const videoId = src.split("/").at(-1)!;
    const frame = document.createElement("iframe");
    frame.src = `${src}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
    frame.title = title; frame.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
    frame.allowFullscreen = true; frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.className = "absolute inset-0 h-full w-full border-0";
    root.append(frame);
    const notify = (text: string) => { if (!cancelled) setStatus(text); };
    const flush = async () => {
      if (sending || !queue.length || !duration || !navigator.onLine) return;
      sending = true;
      const batch = queue.slice(0, 120);
      try {
        const response = await fetch(`/api/learning/lessons/${tracking.lessonId}/video`, {
          method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
          signal: AbortSignal.timeout(20000),
          body: JSON.stringify({ section: tracking.section, videoId, duration, ranges: batch }),
        });
        if (!response.ok) throw new Error("Watch sync failed");
        queue.splice(0, batch.length);
        notify("Đã đồng bộ các đoạn video được phát · không tự đánh dấu hoàn thành.");
      } catch { notify("Chưa đồng bộ mức xem. Giữ trang mở để thử lại; việc học vẫn tiếp tục."); }
      finally { sending = false; }
    };
    void loadYoutube().then(api => {
      if (cancelled) return;
      player = new api.Player(frame, { events: {
        onReady: () => notify("Đo các đoạn video được phát trong web; không tính khoảng tua qua."),
        onStateChange: () => { previous = null; },
        onError: () => { previous = null; notify("Video bị lỗi hoặc chặn nhúng. Hãy mở nguồn / thử lại."); reporter.current?.("VIDEO_LOAD", "YouTube báo lỗi phát hoặc chặn nhúng.", url); },
      } });
    }).catch(() => notify("Không kết nối được bộ đo YouTube. Có thể xem video nhưng mức xem chưa được ghi nhận."));
    const sample = window.setInterval(() => {
      if (!player?.getPlayerState || player.getPlayerState() !== 1) { previous = null; return; }
      const now = { time: player.getCurrentTime(), wall: performance.now(), rate: player.getPlaybackRate() };
      duration = player.getDuration();
      if (duration <= 0 || duration > 86400) { previous = null; return; }
      const interval = previous && playedInterval(previous, now);
      if (interval) {
        // Finite offline buffer; never invent playback for missing samples.
        if (queue.length < 1200) queue.push(interval);
        else notify("Bộ đệm mức xem đã đầy khi mất kết nối; một số đoạn chưa được ghi nhận.");
      }
      previous = now;
    }, 1000);
    const sync = window.setInterval(() => void flush(), 20000);
    const flushOnLeave = () => { void flush(); };
    window.addEventListener("online", flushOnLeave);
    window.addEventListener("pagehide", flushOnLeave);
    document.addEventListener("visibilitychange", flushOnLeave);
    return () => {
      cancelled = true; clearInterval(sample); clearInterval(sync);
      window.removeEventListener("online", flushOnLeave); window.removeEventListener("pagehide", flushOnLeave);
      document.removeEventListener("visibilitychange", flushOnLeave);
      void flush(); player?.destroy(); root.replaceChildren();
    };
  }, [src, url, title, tracking.lessonId, tracking.section]);
  return <><div ref={container} data-media-surface className="relative min-h-[300px] flex-1 bg-gray-50" /><p role="status" className="bg-gray-50 px-3 py-2 text-[10px] text-gray-500">{status}</p></>;
}
