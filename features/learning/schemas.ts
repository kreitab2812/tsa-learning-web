import { z } from "zod";

const context = {
  preview: z.boolean().optional(),
  unlock: z.uuid().nullable().optional(),
  showDrafts: z.boolean().optional(),
  simulated: z.array(z.uuid()).max(200).optional(),
};
const answer = z.union([
  z.string().max(500),
  z.record(z.string().min(1).max(20), z.boolean()),
]);
const answers = z.record(z.uuid(), answer).refine(value => Object.keys(value).length <= 200, "Tối đa 200 câu trả lời.");
const session = { sessionId: z.uuid(), revision: z.number().int().min(0), answers };

export const learningActionSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("OPEN"), ...context }),
  z.strictObject({ action: z.literal("COMPLETE"), ...context }),
  z.strictObject({ action: z.literal("STEP"), step: z.number().int().min(0).max(3), complete: z.boolean().optional(), ...context }),
  z.strictObject({ action: z.literal("START"), requestId: z.uuid(), ...context }),
  z.strictObject({ action: z.literal("SYNC"), ...context }),
  z.strictObject({ action: z.literal("RESET_PREVIEW"), ...context }),
  z.strictObject({ action: z.literal("SAVE"), ...session, ...context }),
  z.strictObject({ action: z.literal("SUBMIT"), ...session, ...context }),
]);

export type LearningAction = z.output<typeof learningActionSchema>;

export const learningErrorSchema = z.strictObject({
  lessonId: z.uuid(),
  type: z.enum(["VIDEO_LOAD", "DOCUMENT_LOAD", "SUBMISSION"]),
  message: z.string().trim().min(1).max(500),
  resourceUrl: z.url({ protocol: /^https?$/ }).max(2048).nullable().optional(),
});

export const linkScanSchema = z.strictObject({
  limit: z.number().int().min(1).max(20).default(20),
  subjectId: z.uuid().optional(), chapterId: z.uuid().optional(),
  lessonId: z.uuid().optional(), kind: z.union([z.enum(["VIDEO_THEORY", "VIDEO_PRACTICE", "DOCUMENT", "EXERCISE", "ANSWER", "THEORY_DOCUMENT", "PRACTICE_DOCUMENT"]), z.string().regex(/^ATTACHMENT:[0-9a-f-]{36}$/i)]).optional(),
}).refine((value) => !value.kind || Boolean(value.lessonId), "Quét riêng cần bài học và loại link.");
