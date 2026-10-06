import { adminHandler } from "@/server/http/handler";
import { readJson } from "@/server/http/request";
import { stageCreateSchema } from "@/features/content/schemas";
import { createStage } from "@/server/admin/content-mutations";

export const POST = adminHandler(async (request) => ({
  stage: await createStage(await readJson(request, stageCreateSchema)),
}));
