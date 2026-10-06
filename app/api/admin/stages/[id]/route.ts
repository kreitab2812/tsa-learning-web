import { adminHandler, routeId, type IdContext } from "@/server/http/handler";
import { readJson } from "@/server/http/request";
import { stagePatchSchema } from "@/features/content/schemas";
import { updateStage, deleteContent } from "@/server/admin/content-mutations";

export const PATCH = adminHandler(async (request, context: IdContext) => ({
  stage: await updateStage(await routeId(context), await readJson(request, stagePatchSchema)),
}));

export const DELETE = adminHandler(async (_request, context: IdContext) => {
  await deleteContent("stage", await routeId(context));
  return {};
});
