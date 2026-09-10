import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Lấy danh sách Khóa học
export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        chapters: {
          include: { lessons: true },
        },
      },
    });
    return NextResponse.json({ success: true, courses });
  } catch (error) {
    console.error("GET /api/admin/courses error:", error);
    return NextResponse.json({ success: false, message: "Lỗi tải dữ liệu" }, { status: 500 });
  }
}

// Thêm mới một Khóa học
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description } = body;

    if (!title) {
      return NextResponse.json({ success: false, message: "Thiếu tên khóa học" }, { status: 400 });
    }

    const newCourse = await prisma.course.create({
      data: { title, description },
    });

    return NextResponse.json({ success: true, course: newCourse });
  } catch (error) {
    console.error("POST /api/admin/courses error:", error);
    return NextResponse.json({ success: false, message: "Lỗi tạo khóa học" }, { status: 500 });
  }
}
