import { adminHandler, routeId, type IdContext } from "@/server/http/handler";
import { readJson } from "@/server/http/request";
import { chapterPatchSchema } from "@/features/content/schemas";
import { updateChapter, deleteContent } from "@/server/admin/content-mutations";

export const PATCH = adminHandler(async (request, context: IdContext) => ({
  chapter: await updateChapter(await routeId(context), await readJson(request, chapterPatchSchema)),
}));

export const DELETE = adminHandler(async (_request, context: IdContext) => {
  await deleteContent("chapter", await routeId(context));
  return {};
});
