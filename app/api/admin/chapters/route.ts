import { adminHandler } from "@/server/http/handler";
import { readJson } from "@/server/http/request";
import { chapterCreateSchema } from "@/features/content/schemas";
import { createChapter } from "@/server/admin/content-mutations";

export const POST = adminHandler(async (request) => ({
  chapter: await createChapter(await readJson(request, chapterCreateSchema)),
}));
