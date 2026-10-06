import { z } from "zod";
import { adminHandler } from "@/server/http/handler";
import { readJson } from "@/server/http/request";
import { HttpError } from "@/server/http/errors";
import { previewQuizImport } from "@/server/admin/quiz-import";

export const POST = adminHandler(async request => {
  const input = await readJson(request, z.strictObject({ filename: z.string().max(250), content: z.string().max(2 * 1024 * 1024) }), 2 * 1024 * 1024);
  try { return { preview: await previewQuizImport(input.filename, input.content) }; }
  catch (cause) { throw new HttpError(400, cause instanceof Error ? cause.message : "Không đọc được tệp nhập."); }
});
