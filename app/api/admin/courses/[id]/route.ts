import { adminHandler, routeId, type IdContext } from "@/server/http/handler";
import { readJson } from "@/server/http/request";
import { coursePatchSchema } from "@/features/content/schemas";
import { updateCourse, deleteContent } from "@/server/admin/content-mutations";
import { getAdminCourse } from "@/server/admin/course-queries";
import { HttpError } from "@/server/http/errors";

export const GET = adminHandler(async (_request, context: IdContext) => {
  const course = await getAdminCourse(await routeId(context));
  if (!course) throw new HttpError(404, "Không tìm thấy khóa học.");
  return { course };
});

export const PATCH = adminHandler(async (request, context: IdContext) => ({
  course: await updateCourse(await routeId(context), await readJson(request, coursePatchSchema)),
}));

export const DELETE = adminHandler(async (_request, context: IdContext) => {
  await deleteContent("course", await routeId(context));
  return {};
});
