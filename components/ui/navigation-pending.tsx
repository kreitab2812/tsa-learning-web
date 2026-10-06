"use client";
import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

/** Must be rendered inside a Next Link; no guessed progress percentages. */
export default function NavigationPending() {
  const { pending } = useLinkStatus();
  return <span role="status" className={`pointer-events-none absolute right-1 top-1 text-bkhn-red ${pending ? "opacity-100" : "opacity-0"}`}><Loader2 size={14} aria-hidden="true" className={pending ? "animate-spin motion-reduce:animate-none" : ""} /><span className="sr-only">{pending ? "Đang mở trang…" : ""}</span></span>;
}
