import { z } from "zod";
import { adminHandler, routeId, type IdContext } from "@/server/http/handler";
import { readJson } from "@/server/http/request";
import { attachmentInput, attachmentPatch } from "@/features/lessons/attachments";
import { addLessonAttachment, listLessonAttachments, patchLessonAttachment, removeLessonAttachment } from "@/server/admin/attachment-service";

export const GET = adminHandler(async (_request, context: IdContext) => ({ attachments: await listLessonAttachments(await routeId(context)) }));
export const POST = adminHandler(async (request, context: IdContext) => ({ attachment: await addLessonAttachment(await routeId(context), await readJson(request, attachmentInput)) }));
export const PATCH = adminHandler(async (request, context: IdContext) => ({ attachment: await patchLessonAttachment(await routeId(context), await readJson(request, attachmentPatch)) }));
export const DELETE = adminHandler(async (request, context: IdContext) => {
  await removeLessonAttachment(await routeId(context), (await readJson(request, z.strictObject({ id: z.string().min(1).max(250) }))).id);
  return {};
});
