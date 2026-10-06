import { adminHandler, routeId, type IdContext } from "@/server/http/handler";
import { pageNumber } from "@/server/http/pagination";
import { listAdminQuestions } from "@/server/admin/lesson-queries";

export const GET = adminHandler(async (request, context: IdContext) =>
  listAdminQuestions(await routeId(context), pageNumber(request)));
