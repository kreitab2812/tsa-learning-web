import { adminHandler, routeId, type IdContext } from "@/server/http/handler";
import { readJson } from "@/server/http/request";
import { questionPatchSchema } from "@/features/content/schemas";
import { updateQuestion, deleteContent } from "@/server/admin/content-mutations";

export const PATCH = adminHandler(async (request, context: IdContext) => ({
  question: await updateQuestion(await routeId(context), await readJson(request, questionPatchSchema, 512 * 1024)),
}));

export const DELETE = adminHandler(async (_request, context: IdContext) => {
  await deleteContent("question", await routeId(context));
  return {};
});
