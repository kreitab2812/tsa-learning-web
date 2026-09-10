import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courseId, title, description, color } = body;

    if (!courseId || !title) {
      return NextResponse.json({ success: false, message: "Thiếu courseId hoặc tên Giai đoạn" }, { status: 400 });
    }

    const order = await prisma.stage.count({ where: { courseId } });

    const stage = await prisma.stage.create({
      data: { 
        title, 
        description: description || null, 
        color: color || "#ef4444",
        courseId, 
        order 
      },
    });

    return NextResponse.json({ success: true, stage });
  } catch (error) {
    // Dòng này sẽ in chi tiết lỗi màu đỏ ra Terminal của VS Code
    console.error("LỖI CHI TIẾT TẠO GIAI ĐOẠN:", error);
    return NextResponse.json({ success: false, message: "Lỗi tạo Giai đoạn" }, { status: 500 });
  }
}
