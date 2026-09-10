import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Chi tiết 1 Khóa học (kèm Chapter + Lesson, sắp theo order)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        chapters: {
          orderBy: { order: "asc" },
          include: { lessons: { orderBy: { order: "asc" } } },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ success: false, message: "Không tìm thấy khóa học" }, { status: 404 });
    }
    return NextResponse.json({ success: true, course });
  } catch (error) {
    console.error("GET /api/admin/courses/[id] error:", error);
    return NextResponse.json({ success: false, message: "Lỗi tải dữ liệu" }, { status: 500 });
  }
}

// Cập nhật Khóa học
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { title, description } = await request.json();

    const updated = await prisma.course.update({
      where: { id },
      data: { title, description },
    });
    return NextResponse.json({ success: true, course: updated });
  } catch (error) {
    console.error("PATCH /api/admin/courses/[id] error:", error);
    return NextResponse.json({ success: false, message: "Lỗi cập nhật khóa học" }, { status: 500 });
  }
}

// Xóa Khóa học (schema đã set onDelete: Cascade nên Chapter/Lesson/Question con sẽ tự xóa theo)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.course.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/courses/[id] error:", error);
    return NextResponse.json({ success: false, message: "Lỗi xóa khóa học" }, { status: 500 });
  }
}
