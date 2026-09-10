import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Lấy chi tiết 1 Bài học kèm danh sách câu hỏi
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        chapter: { select: { id: true, title: true, courseId: true } },
        questions: { orderBy: { order: "asc" } },
      },
    });

    if (!lesson) {
      return NextResponse.json({ success: false, message: "Không tìm thấy bài học" }, { status: 404 });
    }
    return NextResponse.json({ success: true, lesson });
  } catch (error) {
    console.error("GET /api/admin/lessons/[id] error:", error);
    return NextResponse.json({ success: false, message: "Lỗi tải dữ liệu" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { title, videoUrl, documentUrl, order } = await request.json();

    const lesson = await prisma.lesson.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(videoUrl !== undefined && { videoUrl }),
        ...(documentUrl !== undefined && { documentUrl }),
        ...(order !== undefined && { order }),
      },
    });
    return NextResponse.json({ success: true, lesson });
  } catch (error) {
    console.error("PATCH /api/admin/lessons/[id] error:", error);
    return NextResponse.json({ success: false, message: "Lỗi cập nhật bài học" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.lesson.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/lessons/[id] error:", error);
    return NextResponse.json({ success: false, message: "Lỗi xóa bài học" }, { status: 500 });
  }
}
