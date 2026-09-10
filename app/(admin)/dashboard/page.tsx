"use client";
import { Users, BookOpen, FileEdit, TrendingUp } from "lucide-react";

export default function AdminDashboard() {
  const stats = [
    { title: "Tổng học viên", value: "1", icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { title: "Khóa học / Video", value: "2", icon: BookOpen, color: "text-brand-600", bg: "bg-brand-100" },
    { title: "Ngân hàng Đề thi", value: "5", icon: FileEdit, color: "text-purple-600", bg: "bg-purple-100" },
    { title: "Lượt làm bài", value: "12", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-100" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tổng quan hệ thống</h1>
          <p className="text-slate-500 mt-1">Xin chào Quản trị viên, chúc một ngày làm việc hiệu quả.</p>
        </div>
      </div>

      {/* Grid Thống kê */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
              <stat.icon size={28} strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.title}</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Khu vực Báo cáo chi tiết (Chờ phát triển) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 h-96 flex flex-col items-center justify-center text-slate-400">
        <TrendingUp size={48} className="mb-4 text-slate-300" />
        <p className="font-medium text-lg">Biểu đồ tiến độ học viên</p>
        <p className="text-sm">Dữ liệu sẽ được hiển thị khi có học viên tương tác thực tế.</p>
      </div>
    </div>
  );
}
