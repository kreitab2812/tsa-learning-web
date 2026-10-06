import { apiHandler, routeId, type IdContext } from "@/server/http/handler";
import { requireUser } from "@/server/auth/session";
import { readJson } from "@/server/http/request";
import { learningActionSchema } from "@/features/learning/schemas";
import { performLearningAction } from "@/server/learning/service";
import { performWorkflow } from "@/server/learning/workflow";
import { recordLearningError } from "@/server/learning/error-logs";
import { HttpError } from "@/server/http/errors";

export const POST = apiHandler(async (request, context: IdContext) => {
  const user = await requireUser();
  const lessonId = await routeId(context);
  const input = await readJson(request, learningActionSchema, 128 * 1024);
  try {
    return { result: input.action === "SAVE" ? await performWorkflow(user, lessonId, input, true) : await performLearningAction(user, lessonId, input) };
  } catch (error) {
    if (user.role === "STUDENT" && !input.preview && input.action === "SUBMIT" && !(error instanceof HttpError && error.status < 500)) {
      try { await recordLearningError(user, { lessonId, type: "SUBMISSION", message: "Máy chủ không thể xử lý lần nộp bài." }); }
      catch { console.error("Learning submission log unavailable", { lessonId }); }
    }
    throw error;
  }
});
