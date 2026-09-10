"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Bell, User, LogOut, ChevronDown, CheckCircle2, Trash2, BookOpen } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  // State quản lý User và Loading (Tránh lỗi Hydration của Next.js)
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // State UI
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Dữ liệu Thông báo (Mock data đã điều chỉnh cho cả Hệ thống Video & Thi thử)
  const [notifications, setNotifications] = useState([
    { id: 1, title: "Bài giảng mới: Giải mã Tư duy định lượng", time: "2 giờ trước", isRead: false, link: "/courses/tsa-toan", type: "video" },
    { id: 2, title: "Bạn đã hoàn thành bài thi TSA Mô phỏng số 1 với 85 điểm.", time: "1 ngày trước", isRead: false, link: "/account", type: "exam" },
    { id: 3, title: "Chào mừng em đến với Hệ thống Ôn thi TSA!", time: "3 ngày trước", isRead: true, link: "/home", type: "system" },
  ]);

  // 1. Xử lý Đăng nhập & Hydration an toàn
  useEffect(() => {
    const session = localStorage.getItem("userSession");
    if (!session) {
      router.push("/"); // Đẩy về trang đăng nhập nếu chưa có session
    } else {
      setUser(JSON.parse(session));
    }
    setIsLoading(false); // Chuyển state loading sau khi check xong client-side
  }, [router]);

  // 2. Xử lý click ra ngoài để đóng menu (Tối ưu Memory Leak)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    
    // Chỉ gắn listener khi có 1 trong 2 menu đang mở để tiết kiệm tài nguyên
    if (isDropdownOpen || isNotifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen, isNotifOpen]);

  const handleLogout = () => {
    localStorage.removeItem("userSession");
    router.push("/");
  };

  // 3. Logic Thông báo
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotifClick = (notif: any) => {
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
    setIsNotifOpen(false);
    router.push(notif.link);
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const deleteNotif = (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); 
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Hỗ trợ ẩn Navbar khi vào phòng thi (Update path mới theo lộ trình)
  const isExamRoom = pathname?.startsWith("/practice/") || pathname?.startsWith("/exam/");

  // Render màn hình chờ chuẩn để tránh chớp màn hình (Flickering)
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-bkhn-red border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-bold text-gray-500 animate-pulse">Đang tải không gian học tập...</p>
      </div>
    );
  }

  // Nếu không có user (bị đá ra ngoài), không render layout
  if (!user) return null;

  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-50">
      {!isExamRoom && (
        <div className="fixed inset-0 pointer-events-none z-[-1]">
          <div className="hero-deco hero-deco-1"></div>
          <div className="hero-deco hero-deco-2"></div>
        </div>
      )}

      {!isExamRoom && (
        <nav className="bg-white/90 backdrop-blur-md shadow-bkhn-sm border-b border-bkhn-pink px-6 py-3 flex justify-between items-center sticky top-0 z-50">
          
          <Link href="/home" className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="font-black text-3xl text-bkhn-red tracking-tighter drop-shadow-sm">TSA<span className="text-gray-800">'</span></div>
            <div className="hidden sm:flex items-center ml-3 pl-3 border-l-2 border-bkhn-pink">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 mr-2 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></span>
              <span className="text-gray-600 font-bold text-xs uppercase tracking-wider">Hệ thống Học & Thi</span>
            </div>
          </Link>
          
          <div className="flex items-center space-x-5">
            
            {/* CHUÔNG THÔNG BÁO */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2.5 text-gray-400 hover:text-bkhn-red transition-all rounded-full hover:bg-bkhn-pale focus:outline-none"
              >
                <Bell size={20} strokeWidth={2.5} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-bkhn-red text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full border border-white shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-bkhn-lg border border-bkhn-pink overflow-hidden z-50 animate-fade-in">
                  <div className="p-4 border-b border-bkhn-pink bg-bkhn-rose flex justify-between items-center">
                    <h3 className="font-bold text-bkhn-red flex items-center"><Bell size={16} className="mr-2"/> Thông báo</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="text-[11px] text-gray-500 hover:text-bkhn-red font-bold uppercase transition-colors">
                        Đã đọc tất cả
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-sm font-medium">Chưa có thông báo mới.</div>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif.id}
                          onClick={() => handleNotifClick(notif)}
                          className={`p-4 border-b border-gray-50 hover:bg-bkhn-pale cursor-pointer transition-colors relative flex gap-3 group ${!notif.isRead ? 'bg-bkhn-rose/30' : ''}`}
                        >
                          <div className="mt-1 shrink-0">
                            {notif.isRead ? (
                              <CheckCircle2 size={16} className="text-gray-300" />
                            ) : (
                              notif.type === 'video' ? <BookOpen size={16} className="text-bkhn-red" /> : <div className="w-2 h-2 rounded-full bg-bkhn-red mt-1.5 ml-1 animate-pulse"></div>
                            )}
                          </div>
                          <div className="flex-1 pr-6">
                            <p className={`text-sm leading-tight ${!notif.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>{notif.title}</p>
                            <p className="text-xs text-gray-400 mt-1.5 font-medium">{notif.time}</p>
                          </div>
                          <button 
                            onClick={(e) => deleteNotif(e, notif.id)}
                            className="absolute right-3 top-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-red-50"
                            title="Xóa thông báo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* USER DROPDOWN */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-3 focus:outline-none p-1 pr-3 rounded-full hover:bg-bkhn-rose transition-colors border border-transparent hover:border-bkhn-pink"
              >
                <div className="flex flex-col text-right hidden sm:block mt-0.5">
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest leading-none">Học viên</span>
                  <span className="text-sm font-black text-gray-800">{user.username || "Thí sinh"}</span>
                </div>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-bkhn-red to-[#8a0012] text-white flex items-center justify-center font-black text-lg shadow-sm border-2 border-white ring-2 ring-bkhn-pale">
                  {(user.username || "T").charAt(0).toUpperCase()}
                </div>
                <ChevronDown size={14} strokeWidth={3} className={`text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-bkhn-lg border border-bkhn-pink overflow-hidden z-50 animate-fade-in origin-top-right">
                  <div className="p-5 border-b border-bkhn-pink bg-bkhn-rose/50">
                    <p className="font-black text-gray-900 text-lg">{user.username || "Tài khoản Em trai"}</p>
                    <p className="text-xs text-gray-500 font-semibold mt-1">Lộ trình Ôn thi TSA</p>
                  </div>
                  <div className="p-2">
                    <Link 
                      href="/account"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center space-x-3 px-4 py-3.5 text-sm font-bold text-gray-600 hover:bg-bkhn-pale hover:text-bkhn-red rounded-xl transition-colors"
                    >
                      <User size={18} strokeWidth={2.5} />
                      <span>Tiến độ học tập</span>
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-4 py-3.5 text-sm font-bold text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors mt-1"
                    >
                      <LogOut size={18} strokeWidth={2.5} />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </nav>
      )}

      <main className={!isExamRoom ? "max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 relative z-10" : "h-screen w-full"}>
        {children}
      </main>
    </div>
  );
}
