import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Thêm Cụm kiến thức mới vào 1 Môn học (Subject)
export async function POST(request: Request) {
  try {
    const { subjectId, title } = await request.json();

    if (!subjectId || !title) {
      return NextResponse.json({ success: false, message: "Thiếu subjectId hoặc tên cụm kiến thức" }, { status: 400 });
    }

    const order = await prisma.chapter.count({ where: { subjectId } });

    const chapter = await prisma.chapter.create({
      data: { title, subjectId, order },
    });

    return NextResponse.json({ success: true, chapter });
  } catch (error) {
    console.error("POST /api/admin/chapters error:", error);
    return NextResponse.json({ success: false, message: "Lỗi tạo cụm kiến thức" }, { status: 500 });
  }
}
