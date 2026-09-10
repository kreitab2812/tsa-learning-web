import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Thêm Chương mới vào 1 Khóa học
export async function POST(request: Request) {
  try {
    const { courseId, title } = await request.json();

    if (!courseId || !title) {
      return NextResponse.json({ success: false, message: "Thiếu courseId hoặc tên chương" }, { status: 400 });
    }

    const order = await prisma.chapter.count({ where: { courseId } });

    const chapter = await prisma.chapter.create({
      data: { title, courseId, order },
    });

    return NextResponse.json({ success: true, chapter });
  } catch (error) {
    console.error("POST /api/admin/chapters error:", error);
    return NextResponse.json({ success: false, message: "Lỗi tạo chương" }, { status: 500 });
  }
}
