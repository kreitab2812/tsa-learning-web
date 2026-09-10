route.tsimport { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Thêm Câu hỏi mới vào 1 Bài học
export async function POST(request: Request) {
  try {
    const { lessonId, content, imageUrl, options, correctAnswer, explanation } = await request.json();

    if (!lessonId || !content || !options || !correctAnswer) {
      return NextResponse.json({ success: false, message: "Thiếu dữ liệu bắt buộc" }, { status: 400 });
    }

    const order = await prisma.question.count({ where: { lessonId } });

    const question = await prisma.question.create({
      data: { lessonId, content, imageUrl, options, correctAnswer, explanation, order },
    });

    return NextResponse.json({ success: true, question });
  } catch (error) {
    console.error("POST /api/admin/questions error:", error);
    return NextResponse.json({ success: false, message: "Lỗi tạo câu hỏi" }, { status: 500 });
  }
}
