import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { stageId, title, description } = await request.json();
    if (!stageId || !title) return NextResponse.json({ success: false, message: "Thiếu thông tin" }, { status: 400 });

    const order = await prisma.subject.count({ where: { stageId } });
    const subject = await prisma.subject.create({
      data: { title, description, stageId, order },
    });
    return NextResponse.json({ success: true, subject });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Lỗi tạo Môn học" }, { status: 500 });
  }
}
