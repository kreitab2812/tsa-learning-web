import { adminHandler } from "@/server/http/handler";
import { readJson } from "@/server/http/request";
import { lessonCreateSchema } from "@/features/content/schemas";
import { createLesson } from "@/server/admin/content-mutations";

export const POST = adminHandler(async (request) => ({
  lesson: await createLesson(await readJson(request, lessonCreateSchema)),
}));
