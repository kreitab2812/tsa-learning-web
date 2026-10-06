"use client";
import Link from "next/link";
import { BookOpen, LogOut } from "lucide-react";
import type { SessionUser } from "@/features/auth/types";
import { logout } from "@/features/auth/client";

export default function StudentShell({ children, sessionUser }: { children: React.ReactNode; sessionUser: SessionUser }) {
  const name = sessionUser.name || sessionUser.email;
  return <div className="min-h-screen bg-gray-50">
    <nav aria-label="Không gian học tập" className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-bkhn-pink bg-white/95 px-4 py-3 shadow-bkhn-sm backdrop-blur-md sm:px-6">
      <Link href={sessionUser.role === "ADMIN" ? "/dashboard/courses" : "/home"} className="text-3xl font-black tracking-tighter text-bkhn-red">TSA<span className="text-gray-900">’</span></Link>
      <div className="flex items-center gap-3 sm:gap-5">
        {sessionUser.role === "STUDENT" && <Link href="/home" className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-bkhn-red"><BookOpen size={16} />Lộ trình</Link>}
        <div className="min-w-0 text-right"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{sessionUser.role === "ADMIN" ? "Quản trị viên · xem thử" : "Học viên"}</p><p className="max-w-40 truncate text-sm font-black text-gray-800">{name}</p></div>
        <button onClick={() => void logout()} aria-label="Đăng xuất" title="Đăng xuất" className="rounded-xl p-2 text-gray-400 hover:bg-bkhn-rose hover:text-bkhn-red"><LogOut size={18} /></button>
      </div>
    </nav>
    <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
  </div>;
}
