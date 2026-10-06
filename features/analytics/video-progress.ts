import { z } from "zod";

export type WatchRange = [number, number];
const range = z.tuple([z.number().finite().min(0), z.number().finite().max(86400)])
  .refine(([start, end]) => end > start && end - start <= 120, "Đoạn xem không hợp lệ.");
export const videoProgressSchema = z.strictObject({
  section: z.enum(["THEORY", "PRACTICE"]), videoId: z.string().regex(/^[\w-]{11}$/),
  duration: z.number().finite().positive().max(86400), ranges: z.array(range).min(1).max(120),
}).refine(value => value.ranges.every(([, end]) => end <= value.duration + 1), "Đoạn xem vượt thời lượng video.");

export function mergeWatchRanges(ranges: WatchRange[], duration: number): WatchRange[] {
  const merged: WatchRange[] = [];
  for (const [start, end] of ranges.map(([a, b]): WatchRange => [Math.max(0, a), Math.min(duration, b)]).filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0])) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}
export function watchedSeconds(ranges: WatchRange[]) {
  return ranges.reduce((sum, [start, end]) => sum + end - start, 0);
}
/** Reject jumps/seeks and suspended-tab gaps; replayed intervals are merged later. */
export function playedInterval(previous: { time: number; wall: number; rate: number }, current: { time: number; wall: number; rate: number }): WatchRange | null {
  const elapsed = (current.wall - previous.wall) / 1000, advance = current.time - previous.time;
  if (elapsed <= 0 || elapsed > 3 || advance <= 0 || previous.rate !== current.rate || Math.abs(advance - elapsed * current.rate) > 0.6) return null;
  return [previous.time, current.time];
}
