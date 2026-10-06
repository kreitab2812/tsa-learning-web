import { adminHandler } from "@/server/http/handler";
import { readJson } from "@/server/http/request";
import { reorderSchema } from "@/features/content/schemas";
import { reorderContent } from "@/server/admin/content-mutations";

export const POST = adminHandler(async (request) => {
  await reorderContent("lesson", await readJson(request, reorderSchema));
  return {};
});
