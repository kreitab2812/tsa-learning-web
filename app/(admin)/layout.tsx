"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  FileEdit,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // mở/đóng trên mobile
  const [isCollapsed, setIsCollapsed] = useState(false); // thu gọn thành icon trên desktop

  useEffect(() => {
    const session = localStorage.getItem("userSession");
    if (!session) {
      router.push("/");
    } else {
      const user = JSON.parse(session);
      if (user.role !== "ADMIN") {
        router.push("/home");
      } else {
        setAdmin(user);
      }
    }
    // Khôi phục trạng thái thu gọn sidebar đã lưu lần trước
    const savedCollapsed = localStorage.getItem("adminSidebarCollapsed");
    if (savedCollapsed === "true") setIsCollapsed(true);
    setIsLoading(false);
  }, [router]);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      localStorage.setItem("adminSidebarCollapsed", String(!prev));
      return !prev;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfcfc]">
        <div className="w-8 h-8 border-4 border-bkhn-red border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!admin) return null;

  const menuItems = [
    { name: "Tổng quan", icon: LayoutDashboard, path: "/dashboard" },
    { name: "Khóa học & Video", icon: BookOpen, path: "/dashboard/courses" },
    { name: "Ngân hàng Đề thi", icon: FileEdit, path: "/dashboard/exams" },
    { name: "Quản lý Học viên", icon: Users, path: "/dashboard/users" },
    { name: "Cài đặt hệ thống", icon: Settings, path: "/dashboard/settings" },
  ];

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
      <aside
        className={`fixed inset-y-0 left-0 bg-white/95 backdrop-blur-md border-r border-bkhn-pink transition-all duration-300 z-50 flex flex-col ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:block ${isCollapsed ? "w-20" : "w-64"}`}
      >
        <div className={`h-16 flex items-center border-b border-bkhn-pink shrink-0 ${isCollapsed ? "justify-center px-2" : "justify-between px-6"}`}>
          <Link href="/dashboard" className="flex items-baseline gap-0.5 overflow-hidden">
            <span className="font-black text-2xl text-bkhn-red tracking-tighter">TSA</span>
            {!isCollapsed && <span className="font-black text-2xl text-gray-800 tracking-tighter">Admin</span>}
          </Link>
          <button className="lg:hidden text-gray-500" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {!isCollapsed && (
          <div className="px-6 py-3 border-b border-bkhn-pink shrink-0">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              Quản trị hệ thống
            </span>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {menuItems.map((item) => {
            const isActive =
              item.path === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === item.path || pathname?.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsSidebarOpen(false)}
                title={isCollapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all border-l-4 ${
                  isCollapsed ? "justify-center px-0" : ""
                } ${
                  isActive
                    ? "bg-bkhn-pale text-bkhn-red border-bkhn-red shadow-bkhn-sm"
                    : "text-gray-600 border-transparent hover:bg-bkhn-rose hover:text-bkhn-red"
                }`}
              >
                <item.icon size={19} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Nút thu gọn / mở rộng — chỉ hiện trên desktop */}
        <button
          onClick={toggleCollapse}
          className="hidden lg:flex items-center gap-2 mx-4 mb-2 px-4 py-2.5 text-gray-500 font-bold text-xs rounded-xl hover:bg-bkhn-rose hover:text-bkhn-red transition-colors justify-center shrink-0"
          title={isCollapsed ? "Mở rộng thanh điều khiển" : "Thu gọn thanh điều khiển"}
        >
          {isCollapsed ? <ChevronsRight size={18} /> : (
            <>
              <ChevronsLeft size={18} />
              <span>Thu gọn</span>
            </>
          )}
        </button>

        <div className={`p-4 border-t border-bkhn-pink shrink-0 bg-white/95 ${isCollapsed ? "px-2" : ""}`}>
          <div className={`flex items-center gap-3 mb-2 ${isCollapsed ? "justify-center" : "px-2"}`}>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-bkhn-red to-[#8a0012] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
              {(admin.username || admin.name || "A").charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-black text-gray-900 truncate">
                  {admin.username || admin.name || "Quản trị viên"}
                </p>
                <p className="text-[11px] font-semibold text-gray-400">Quản trị viên</p>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("userSession");
              router.push("/");
            }}
            title={isCollapsed ? "Đăng xuất" : undefined}
            className={`flex items-center gap-3 w-full px-4 py-3 text-gray-600 font-bold text-sm rounded-2xl hover:bg-red-50 hover:text-bkhn-red transition-colors ${
              isCollapsed ? "justify-center px-0" : ""
            }`}
          >
            <LogOut size={18} className="shrink-0" />
            {!isCollapsed && "Đăng xuất"}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen w-full overflow-hidden">
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-bkhn-pink flex items-center justify-between px-4 lg:hidden shrink-0 sticky top-0 z-30">
          <button
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
