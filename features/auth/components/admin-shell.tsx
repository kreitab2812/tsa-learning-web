"use client";
import { startTransition, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import NavigationPending from "@/components/ui/navigation-pending";
import {
  LayoutDashboard,
  BookOpen,
  Settings,
  HeartPulse,
  UsersRound,
  LogOut,
  Menu,
  X,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { SessionUser } from "@/features/auth/types";
import { logout } from "@/features/auth/client";

export default function AdminShell({ children, user }: { children: React.ReactNode; user: SessionUser }) {
  const admin = { ...user, username: user.name || user.email };
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // mobile starts closed
  const [isCollapsed, setIsCollapsed] = useState(false); // thu gọn thành icon trên desktop

  useEffect(() => {
    // Khôi phục trạng thái thu gọn sidebar đã lưu lần trước
    let savedCollapsed: string | null = null;
    try { savedCollapsed = localStorage.getItem("adminSidebarCollapsed"); } catch { /* Storage may be disabled. */ }
    if (savedCollapsed === "true") startTransition(() => setIsCollapsed(true));
  }, []);

  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!isSidebarOpen || window.matchMedia("(min-width: 1024px)").matches) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const controls = () => Array.from(sidebar.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []).filter(node => node.getClientRects().length > 0);
    controls()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setIsSidebarOpen(false); menuButton.current?.focus(); }
      if (event.key === "Tab") {
        const items = controls(), first = items[0], last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKey); };
  }, [isSidebarOpen]);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      try { localStorage.setItem("adminSidebarCollapsed", String(!prev)); } catch { /* Keep the toggle usable without storage. */ }
      return !prev;
    });
  };

  const menuItems = [
    { name: "Tổng quan", icon: LayoutDashboard, path: "/dashboard" },
    { name: "Khóa học & Video", icon: BookOpen, path: "/dashboard/courses" },
    { name: "Tiến trình & Sức khỏe", icon: HeartPulse, path: "/dashboard/health" },
    { name: "Tài khoản học sinh", icon: UsersRound, path: "/dashboard/students" },
    { name: "Tài khoản quản trị", icon: Settings, path: "/dashboard/settings" },
  ];

  const compact = isCollapsed && !isSidebarOpen;

  // The lesson builder owns its navigation; leave other admin screens unchanged.
  if (pathname?.startsWith("/dashboard/lessons/")) {
    return <main className="min-h-screen bg-bkhn-pale/40 p-3 sm:p-6 lg:p-8">{children}</main>;
  }

  return (
    <div className="min-h-screen flex relative">
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="hero-deco hero-deco-1"></div>
        <div className="hero-deco hero-deco-2"></div>
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside ref={sidebar} id="admin-sidebar" aria-label="Điều hướng chính"
        className={`fixed inset-y-0 left-0 bg-white/95 backdrop-blur-md border-r border-bkhn-pink transition-[width,transform] duration-200 z-50 flex flex-col ${
          isSidebarOpen ? "visible translate-x-0" : "invisible -translate-x-full"
        } lg:visible lg:translate-x-0 lg:sticky lg:top-0 lg:flex h-dvh shrink-0 ${compact ? "w-20" : "w-64"}`}
      >
        <div className={`h-16 flex items-center border-b border-bkhn-pink shrink-0 ${compact ? "justify-center px-2" : "justify-between px-6"}`}>
          <Link href="/dashboard" className="flex items-baseline gap-0.5 overflow-hidden">
            <span className="font-black text-2xl text-bkhn-red tracking-tighter">TSA</span>
            {!compact && <span className="font-black text-2xl text-gray-800 tracking-tighter">Admin</span>}
          </Link>
          <button aria-label="Đóng menu" className="lg:hidden rounded-lg p-2 text-gray-500" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>


        <nav className={`flex-1 space-y-1 overflow-y-auto overflow-x-hidden ${compact ? "p-2" : "p-4"}`}>
          {menuItems.map((item) => {
            const isActive =
              item.path === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === item.path || pathname?.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.path}
                href={item.path}
                prefetch={item.path === "/dashboard/health" ? false : undefined}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.name}
                onClick={() => setIsSidebarOpen(false)}
                title={compact ? item.name : undefined}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-colors border-l-4 ${
                  compact ? "justify-center px-0" : ""
                } ${
                  isActive
                    ? "bg-bkhn-pale text-bkhn-red border-bkhn-red shadow-bkhn-sm"
                    : "text-gray-600 border-transparent hover:bg-bkhn-rose hover:text-bkhn-red"
                }`}
              >
                <item.icon size={19} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                {!compact && <span className="truncate">{item.name}</span>}
                <NavigationPending />
              </Link>
            );
          })}
        </nav>

        {/* Nút thu gọn / mở rộng — chỉ hiện trên desktop */}
        <button
          aria-label={compact ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          onClick={toggleCollapse}
          className="hidden lg:flex items-center gap-2 mx-4 mb-2 px-4 py-2.5 text-gray-500 font-bold text-xs rounded-xl hover:bg-bkhn-rose hover:text-bkhn-red transition-colors justify-center shrink-0"
          title={compact ? "Mở rộng thanh điều khiển" : "Thu gọn thanh điều khiển"}
        >
          {compact ? <ChevronsRight size={18} /> : (
            <>
              <ChevronsLeft size={18} />
              <span>Thu gọn</span>
            </>
          )}
        </button>

        <div className={`p-4 border-t border-bkhn-pink shrink-0 bg-white/95 ${compact ? "px-2" : ""}`}>
          <div className={`flex items-center gap-3 mb-2 ${compact ? "justify-center" : "px-2"}`}>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-bkhn-red to-[#8a0012] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
              {(admin.username || admin.name || "A").charAt(0).toUpperCase()}
            </div>
            {!compact && (
              <div className="min-w-0">
                <p className="text-sm font-black text-gray-900 truncate">
                  {admin.username || admin.name || "Quản trị viên"}
                </p>
                <p className="text-[11px] font-semibold text-gray-400">Quản trị viên</p>
              </div>
            )}
          </div>
          <button
            aria-label="Đăng xuất"
            onClick={() => void logout()}
            title={compact ? "Đăng xuất" : undefined}
            className={`flex items-center gap-3 w-full px-4 py-3 text-gray-600 font-bold text-sm rounded-2xl hover:bg-red-50 hover:text-bkhn-red transition-colors ${
              compact ? "justify-center px-0" : ""
            }`}
          >
            <LogOut size={18} className="shrink-0" />
            {!compact && "Đăng xuất"}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen w-full overflow-hidden">
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-bkhn-pink flex items-center justify-between px-4 lg:hidden shrink-0 sticky top-0 z-30">
          <button
            ref={menuButton}
            aria-label="Mở menu"
            aria-expanded={isSidebarOpen}
            aria-controls="admin-sidebar"
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-600 hover:bg-bkhn-pale hover:text-bkhn-red rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-baseline gap-0.5">
            <span className="font-black text-xl text-bkhn-red tracking-tighter">TSA</span>
            <span className="font-black text-xl text-gray-800 tracking-tighter">Admin</span>
          </div>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-bkhn-red to-[#8a0012] text-white flex items-center justify-center font-black text-xs shadow-sm">
            {(admin.username || admin.name || "A").charAt(0).toUpperCase()}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}
