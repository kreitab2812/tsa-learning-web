import { z } from "zod";
import { adminHandler, routeId, type IdContext } from "@/server/http/handler";
import { readJson } from "@/server/http/request";
import { duplicateQuestion, moveQuestion } from "@/server/admin/question-actions";

export const POST = adminHandler<IdContext>(async (request, context) => {
  const id = await routeId(context);
  const { action } = await readJson(request, z.strictObject({ action: z.enum(["duplicate", "up", "down"]) }));
  if (action === "duplicate") return { question: await duplicateQuestion(id) };
  await moveQuestion(id, action);
  return {};
});
