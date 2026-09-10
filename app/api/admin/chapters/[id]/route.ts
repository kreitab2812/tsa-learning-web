import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { title, order } = await request.json();

    const chapter = await prisma.chapter.update({
      where: { id },
      data: { title, ...(order !== undefined && { order }) },
    });
    return NextResponse.json({ success: true, chapter });
  } catch (error) {
    console.error("PATCH /api/admin/chapters/[id] error:", error);
    return NextResponse.json({ success: false, message: "Lỗi cập nhật chương" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.chapter.delete({ where: { id } }); // Cascade xóa luôn Lesson/Question bên trong
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/chapters/[id] error:", error);
    return NextResponse.json({ success: false, message: "Lỗi xóa chương" }, { status: 500 });
  }
}
