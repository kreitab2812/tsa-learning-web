import { adminHandler } from "@/server/http/handler";
import { readJson } from "@/server/http/request";
import { bulkQuestionsSchema } from "@/features/content/schemas";
import { importQuestions } from "@/server/admin/content-mutations";
import { z } from "zod";

export const POST = adminHandler(async (request) => {
  const { reviewed: _reviewed, ...input } = await readJson(request, bulkQuestionsSchema.extend({ reviewed: z.literal(true) }), 1024 * 1024);
  void _reviewed;
  const questions = await importQuestions(input);
  return { questions, count: questions.length };
});
