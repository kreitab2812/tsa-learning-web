import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Thêm Bài học mới vào 1 Chương
export async function POST(request: Request) {
  try {
    const { chapterId, title, videoUrl, documentUrl } = await request.json();

    if (!chapterId || !title) {
      return NextResponse.json({ success: false, message: "Thiếu chapterId hoặc tên bài học" }, { status: 400 });
    }

    const order = await prisma.lesson.count({ where: { chapterId } });

    const lesson = await prisma.lesson.create({
      data: { title, chapterId, order, videoUrl, documentUrl },
    });

    return NextResponse.json({ success: true, lesson });
  } catch (error) {
    console.error("POST /api/admin/lessons error:", error);
    return NextResponse.json({ success: false, message: "Lỗi tạo bài học" }, { status: 500 });
  }
}
