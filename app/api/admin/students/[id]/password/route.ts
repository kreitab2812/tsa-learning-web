import { adminHandler, routeId, type IdContext } from "@/server/http/handler";
import { readJson } from "@/server/http/request";
import { studentPasswordSchema } from "@/features/students/schemas";
import { resetStudentPassword } from "@/server/admin/student-accounts";

export const POST = adminHandler(async (request, context: IdContext) => {
  await resetStudentPassword(await routeId(context), await readJson(request, studentPasswordSchema, 4096));
  return {};
});

