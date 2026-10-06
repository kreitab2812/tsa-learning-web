import { apiHandler, routeId, type IdContext } from "@/server/http/handler";
import { requireUser } from "@/server/auth/session";
import { readJson } from "@/server/http/request";
import { videoProgressSchema } from "@/features/analytics/video-progress";
import { recordVideoProgress } from "@/server/learning/video-progress";

export const POST = apiHandler(async (request, context: IdContext) => {
  const user = await requireUser();
  await recordVideoProgress(user, await routeId(context), await readJson(request, videoProgressSchema, 12 * 1024));
  return {};
});
