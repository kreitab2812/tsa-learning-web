import { apiHandler } from "@/server/http/handler";
import { requireUser } from "@/server/auth/session";
import { readJson } from "@/server/http/request";
import { learningErrorSchema } from "@/features/learning/schemas";
import { recordLearningError } from "@/server/learning/error-logs";

export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  await recordLearningError(user, await readJson(request, learningErrorSchema));
  return {};
});
