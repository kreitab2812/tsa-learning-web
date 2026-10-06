import { adminHandler } from "@/server/http/handler";
import { readJson } from "@/server/http/request";
import { questionCreateSchema } from "@/features/content/schemas";
import { createQuestion } from "@/server/admin/content-mutations";

export const POST = adminHandler(async (request) => ({
  question: await createQuestion(await readJson(request, questionCreateSchema, 512 * 1024)),
}));
