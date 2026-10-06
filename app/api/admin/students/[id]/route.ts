import { adminHandler, routeId, type IdContext } from "@/server/http/handler";
import { readJson } from "@/server/http/request";
import { studentPatchSchema } from "@/features/students/schemas";
import { deleteStudent, updateStudent } from "@/server/admin/student-accounts";

export const PATCH = adminHandler(async (request, context: IdContext) => ({ student: await updateStudent(await routeId(context), await readJson(request, studentPatchSchema, 4096)) }));
export const DELETE = adminHandler(async (_request, context: IdContext) => { await deleteStudent(await routeId(context)); return {}; });

