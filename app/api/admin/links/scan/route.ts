import { adminHandler } from "@/server/http/handler";
import { readJson } from "@/server/http/request";
import { linkScanSchema } from "@/features/learning/schemas";
import { scanLessonLinks } from "@/server/admin/link-scanner";

export const POST = adminHandler(async (request) => {
  const input = await readJson(request, linkScanSchema);
  return { result: await scanLessonLinks(input) };
});
