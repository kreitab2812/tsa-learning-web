import { adminHandler } from "@/server/http/handler";
import { readJson } from "@/server/http/request";
import { subjectCreateSchema } from "@/features/content/schemas";
import { createSubject } from "@/server/admin/content-mutations";

export const POST = adminHandler(async (request) => ({
  subject: await createSubject(await readJson(request, subjectCreateSchema)),
}));
