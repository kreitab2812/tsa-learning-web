import { adminHandler, routeId, type IdContext } from "@/server/http/handler";
import { readJson } from "@/server/http/request";
import { subjectPatchSchema } from "@/features/content/schemas";
import { updateSubject, deleteContent } from "@/server/admin/content-mutations";
import { getAdminSubjectTree } from "@/server/admin/course-queries";

export const GET = adminHandler(async (_request, context: IdContext) => ({
  subject: await getAdminSubjectTree(await routeId(context)),
}));

export const PATCH = adminHandler(async (request, context: IdContext) => ({
  subject: await updateSubject(await routeId(context), await readJson(request, subjectPatchSchema)),
}));

export const DELETE = adminHandler(async (_request, context: IdContext) => {
  await deleteContent("subject", await routeId(context));
  return {};
});
