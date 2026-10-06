import { adminHandler, routeId, type IdContext } from "@/server/http/handler";
import { readJson } from "@/server/http/request";
import { subjectOrderSchema } from "@/features/courses/order-schema";
import { saveSubjectOrder } from "@/server/admin/subject-order";

export const PATCH = adminHandler(async (request, context: IdContext) => {
  await saveSubjectOrder(await routeId(context), await readJson(request, subjectOrderSchema, 1024 * 1024));
  return {};
});
