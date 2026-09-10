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
  X
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 1. Kiểm tra Quyền Truy Cập (RBAC)
  useEffect(() => {
    const session = localStorage.getItem("userSession");
    if (!session) {
      router.push("/");
    } else {
      const user = JSON.parse(session);
      if (user.role !== "ADMIN") {
        router.push("/home"); // Nếu là Học viên, đẩy về trang Home của học viên
      } else {
        setAdmin(user);
      }
    }
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
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
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Cố định bên trái */}
      <aside className={`fixed inset-y-0 left-0 bg-white border-r border-slate-200 w-64 transition-transform duration-300 z-50 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:block`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
          <div className="font-black text-2xl text-slate-800 tracking-tighter">
            TSA<span className="text-brand-600">Admin</span>
          </div>
          <button className="lg:hidden text-slate-500" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.path || pathname?.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                  isActive 
                    ? "bg-brand-50 text-brand-600" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 bg-white">
          <button 
            onClick={() => {
              localStorage.removeItem("userSession");
              router.push("/");
            }}
            className="flex items-center gap-3 w-full px-4 py-3 text-slate-600 font-semibold rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={20} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen w-full lg:ml-0 overflow-hidden">
        {/* Top Header cho Mobile */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:hidden">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-lg">
            <Menu size={24} />
          </button>
          <div className="font-black text-xl text-slate-800 tracking-tighter">
            TSA<span className="text-brand-600">Admin</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold">
            A
          </div>
        </header>

        {/* Khu vực nhúng nội dung trang con */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
