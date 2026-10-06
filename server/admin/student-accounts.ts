import "server-only";
import { prisma } from "@/server/db/prisma";
import { hashPassword } from "@/server/auth/password";
import { HttpError } from "@/server/http/errors";
import { studentCreateSchema, studentPatchSchema, studentPasswordSchema } from "@/features/students/schemas";
import type { z } from "zod";

export async function listStudents() {
  const students = await prisma.user.findMany({ where: { role: "STUDENT" }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: {
    id: true, name: true, email: true, createdAt: true,
    _count: { select: { sessions: true, progress: true, attempts: true, activities: true } },
  } });
  return students.map(student => ({ ...student, createdAt: student.createdAt.toISOString() }));
}

export async function createStudent(raw: z.input<typeof studentCreateSchema>) {
  const input = studentCreateSchema.parse(raw);
  return prisma.user.create({ data: { name: input.name, email: input.email, passwordHash: await hashPassword(input.password), role: "STUDENT" },
    select: { id: true, name: true, email: true, createdAt: true } });
}

async function assertStudent(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!user || user.role !== "STUDENT") throw new HttpError(404, "Không tìm thấy tài khoản học sinh.");
}

export async function updateStudent(id: string, raw: z.input<typeof studentPatchSchema>) {
  await assertStudent(id);
  const input = studentPatchSchema.parse(raw);
  return prisma.user.update({ where: { id }, data: input, select: { id: true, name: true, email: true, createdAt: true } });
}

export async function resetStudentPassword(id: string, raw: z.input<typeof studentPasswordSchema>) {
  await assertStudent(id);
  const { password } = studentPasswordSchema.parse(raw);
  const passwordHash = await hashPassword(password);
  await prisma.$transaction(async tx => {
    await tx.user.update({ where: { id }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId: id } });
  });
}

export async function revokeStudentSessions(id: string) {
  await assertStudent(id);
  return prisma.session.deleteMany({ where: { userId: id } });
}

export async function deleteStudent(id: string) {
  await assertStudent(id);
  await prisma.user.delete({ where: { id } });
}

