"use client";
import Link from "next/link";
import { PlayCircle, PenTool, Clock, Award } from "lucide-react";

export default function HomePage() {
  // Mock dữ liệu tạm thời để dựng UI. Chặng sau ta sẽ call API từ Prisma Database.
  const courses = [
    { id: "tsa-toan", title: "TSA: Tư duy Toán học", progress: 45, totalLessons: 20 },
    { id: "tsa-doc-hieu", title: "TSA: Đọc hiểu", progress: 10, totalLessons: 15 },
  ];

  const exams = [
    { id: "mock-1", title: "Đề thi thử TSA Mô phỏng số 1", time: "120 phút", status: "Chưa làm" },
    { id: "mock-2", title: "Đề thi TSA Chính thức 2023", time: "120 phút", status: "Chưa làm" },
  ];

  return (
    <div className="space-y-10 animate-fade-in-up">
      {/* Section 1: Lộ trình Bài giảng (Video) */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
            <PlayCircle className="text-bkhn-red" size={28} />
            Khóa Học Bài Giảng
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map(course => (
            <Link href={`/courses/${course.id}`} key={course.id} className="group block bg-white rounded-3xl p-6 shadow-sm hover:shadow-bkhn-lg border border-gray-100 hover:border-bkhn-pink transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-red-50 text-bkhn-red rounded-2xl group-hover:bg-bkhn-red group-hover:text-white transition-colors">
                  <PlayCircle size={32} strokeWidth={2} />
                </div>
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">
                  {course.totalLessons} Bài học
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4 group-hover:text-bkhn-red transition-colors">{course.title}</h3>
              
              {/* Thanh tiến độ (Progress Bar) */}
              <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2 overflow-hidden">
                <div className="bg-bkhn-red h-2.5 rounded-full transition-all duration-1000" style={{ width: `${course.progress}%` }}></div>
              </div>
              <p className="text-right text-sm font-bold text-gray-400">Hoàn thành {course.progress}%</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Section 2: Luyện Đề Thi Thử */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
            <PenTool className="text-blue-600" size={28} />
            Phòng Luyện Đề
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.map(exam => (
            <Link href={`/practice/${exam.id}`} key={exam.id} className="group flex flex-col justify-between bg-white rounded-3xl p-6 shadow-sm hover:shadow-lg border border-gray-100 hover:border-blue-200 transition-all">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-blue-600">{exam.title}</h3>
                <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
                  <span className="flex items-center gap-1"><Clock size={16}/> {exam.time}</span>
                  <span className="flex items-center gap-1"><Award size={16}/> TSA Format</span>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button className="bg-blue-50 text-blue-600 font-bold px-6 py-2 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  Vào thi
                </button>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
