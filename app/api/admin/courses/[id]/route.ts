import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Đã thêm ngoặc nhọn {} ở đây

// Chi tiết 1 Khóa học (Lấy trọn vẹn 5 tầng: Course -> Stage -> Subject -> Chapter -> Lesson)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        stages: {
          orderBy: { order: "asc" },
          include: {
            subjects: {
              orderBy: { order: "asc" },
              include: {
                chapters: {
                  orderBy: { order: "asc" },
                  include: { 
                    lessons: { orderBy: { order: "asc" } } 
                  },
                },
              },
            },
          },
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

// Xóa Khóa học
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
