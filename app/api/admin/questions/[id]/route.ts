import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { content, imageUrl, options, correctAnswer, explanation } = await request.json();

    const question = await prisma.question.update({
      where: { id },
      data: {
        ...(content !== undefined && { content }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(options !== undefined && { options }),
        ...(correctAnswer !== undefined && { correctAnswer }),
        ...(explanation !== undefined && { explanation }),
      },
    });
    return NextResponse.json({ success: true, question });
  } catch (error) {
    console.error("PATCH /api/admin/questions/[id] error:", error);
    return NextResponse.json({ success: false, message: "Lỗi cập nhật câu hỏi" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.question.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/questions/[id] error:", error);
    return NextResponse.json({ success: false, message: "Lỗi xóa câu hỏi" }, { status: 500 });
  }
}
