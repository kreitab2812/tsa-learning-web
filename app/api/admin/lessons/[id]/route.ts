import { adminHandler, routeId, type IdContext } from "@/server/http/handler";
import { readJson } from "@/server/http/request";
import { lessonPatchSchema } from "@/features/content/schemas";
import { updateLesson, deleteContent } from "@/server/admin/content-mutations";
import { getAdminLesson } from "@/server/admin/lesson-queries";

export const GET = adminHandler(async (_request, context: IdContext) => ({
  lesson: await getAdminLesson(await routeId(context)),
}));

export const PATCH = adminHandler(async (request, context: IdContext) => {
  const id = await routeId(context);
  await updateLesson(id, await readJson(request, lessonPatchSchema));
  // Include synchronized attachments so the live viewer and hub do not retain old links.
  return { lesson: await getAdminLesson(id) };
});

export const DELETE = adminHandler(async (_request, context: IdContext) => {
  await deleteContent("lesson", await routeId(context));
  return {};
});
