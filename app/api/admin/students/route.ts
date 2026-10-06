import { adminHandler } from "@/server/http/handler";
import { readJson } from "@/server/http/request";
import { studentCreateSchema } from "@/features/students/schemas";
import { createStudent, listStudents } from "@/server/admin/student-accounts";

export const GET = adminHandler(async () => ({ students: await listStudents() }));
export const POST = adminHandler(async request => ({ student: await createStudent(await readJson(request, studentCreateSchema, 4096)) }));

