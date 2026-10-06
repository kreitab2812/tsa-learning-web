import { z } from "zod";
import { getDriveFile } from "@/lib/media";

export const idSchema = z.uuid();
const title = z.string().trim().min(1, "Không được để trống.").max(250);
const description = z.string().trim().max(10000).nullable().optional();
const shortText = z.string().trim().max(250).nullable().optional();
const url = z.union([
  z.url({ protocol: /^https?$/ }).max(2048),
  z.literal("").transform(() => null),
]).nullable().optional();
// Require an explicit timezone; datetime-local values must be converted by UI.
const dateTime = z.iso.datetime({ offset: true }).nullable().optional();

export const courseFields = z.strictObject({
  title, description, thumbnailUrl: url, badge: shortText,
  status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED"]).default("DRAFT"),
  publishAt: dateTime, showCountdown: z.boolean().default(true),
});
export const courseSchema = courseFields.refine(
  (course) => course.status !== "SCHEDULED" || !!course.publishAt,
  { path: ["publishAt"], message: "Khóa học hẹn giờ cần thời điểm xuất bản." },
);
export const coursePatchSchema = courseFields.partial().extend({
  status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED"]).optional(), showCountdown: z.boolean().optional(),
});

export const stageFields = z.strictObject({
  title, description, color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  timeframe: shortText, accessMode: z.enum(["FREE", "TIME_LOCKED", "SEQUENTIAL"]).default("FREE"),
  unlockAt: dateTime,
});
export const stageSchema = stageFields.refine(
  (stage) => stage.accessMode !== "TIME_LOCKED" || !!stage.unlockAt,
  { path: ["unlockAt"], message: "Giai đoạn khóa theo thời gian cần ngày mở." },
);
export const stageCreateSchema = stageSchema.safeExtend({ courseId: idSchema });
export const stagePatchSchema = stageFields.partial().extend({ accessMode: z.enum(["FREE", "TIME_LOCKED", "SEQUENTIAL"]).optional() });
export const subjectFields = z.strictObject({ title, description, teacherName: shortText });
export const subjectCreateSchema = subjectFields.extend({ stageId: idSchema });
export const subjectPatchSchema = subjectFields.partial();
export const chapterFields = z.strictObject({
  title, description, status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  openAt: dateTime, closeAt: dateTime,
});
export const chapterSchema = chapterFields.refine(
  (chapter) => !chapter.openAt || !chapter.closeAt || new Date(chapter.closeAt) > new Date(chapter.openAt),
  { path: ["closeAt"], message: "Ngày đóng phải sau ngày mở." },
);
export const chapterCreateSchema = chapterSchema.safeExtend({ subjectId: idSchema, parentId: idSchema.nullable().optional() });
export const chapterPatchSchema = chapterFields.partial().extend({ status: z.enum(["DRAFT", "PUBLISHED"]).optional() });
export const lessonFields = z.strictObject({
  title, status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  videoTheoryUrl: url, videoPracticeUrl: url, documentUrl: url, exerciseUrl: url, answerUrl: url,
  theoryDocumentUrl: url, practiceDocumentUrl: url,
  theorySplitView: z.boolean().optional(), practiceSplitView: z.boolean().optional(),
  completionMode: z.enum(["MANUAL", "QUIZ_SUBMITTED", "QUIZ_PASSED"]).optional(),
  stepNavigation: z.enum(["FREE", "SEQUENTIAL"]).optional(),
  requireCompletionForNext: z.boolean().optional(),
  quizTimeLimitMinutes: z.number().int().min(1).max(1440).nullable().optional(),
  quizPassPercent: z.number().int().min(1).max(100).optional(),
  quizMaxAttempts: z.number().int().min(1).max(100).nullable().optional(),
  quizShuffleQuestions: z.boolean().optional(), quizShuffleAnswers: z.boolean().optional(),
});
export const additionalDocumentSchema = z.strictObject({
  title: z.string().trim().min(1, "Cần nhập tên tài liệu.").max(250),
  url: z.string().max(2048).refine(value => !!getDriveFile(value), "Cần link tệp Google Drive, không phải link thư mục."),
});
const additionalDocuments = z.array(additionalDocumentSchema).max(10, "Màn tạo nhanh nhận tối đa 10 tài liệu bổ sung.").optional();
export const lessonCreateSchema = lessonFields.extend({ chapterId: idSchema, additionalDocuments });
export const lessonPatchSchema = lessonFields.partial().extend({ status: z.enum(["DRAFT", "PUBLISHED"]).optional(), additionalDocuments });
export const reorderSchema = z.strictObject({ id: idSchema, direction: z.enum(["up", "down"]) });

const option = z.strictObject({ id: z.string().trim().min(1).max(20), text: z.string().trim().min(1).max(10000) });
const statement = option.extend({ isTrue: z.boolean() });
export const questionFields = z.strictObject({
  type: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE_GROUP", "SHORT_ANSWER"]).default("MULTIPLE_CHOICE"),
  content: z.string().trim().min(1).max(20000), imageUrl: url,
  options: z.union([z.array(option).max(20), z.array(statement).max(20)]).nullable().optional(),
  correctAnswer: z.string().trim().max(500).nullable().optional(), explanation: description,
});
export const questionSchema = questionFields.superRefine((question, ctx) => {
  const fail = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
  const options = question.options ?? [];
  if (new Set(options.map((o) => o.id)).size !== options.length) fail("options", "ID đáp án phải khác nhau.");
  if (question.type === "MULTIPLE_CHOICE") {
    if (options.length !== 4 || options.some((o) => !["A", "B", "C", "D"].includes(o.id) || "isTrue" in o)) {
      fail("options", "Cần đúng 4 đáp án A, B, C, D.");
    }
    if (!options.some((o) => o.id === question.correctAnswer)) fail("correctAnswer", "Đáp án đúng phải thuộc các lựa chọn.");
  } else if (question.type === "TRUE_FALSE_GROUP") {
    if (!options.length || options.some((o) => !("isTrue" in o))) fail("options", "Mỗi mệnh đề cần isTrue kiểu boolean.");
    if (question.correctAnswer) fail("correctAnswer", "Đáp án đúng/sai nằm trong từng mệnh đề.");
  } else {
    if (!question.correctAnswer) fail("correctAnswer", "Cần nhập đáp án ngắn.");
    if (options.length) fail("options", "Câu trả lời ngắn không có lựa chọn.");
  }
});
export const questionCreateSchema = questionSchema.safeExtend({ lessonId: idSchema });
export const questionPatchSchema = questionFields.partial().extend({ type: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE_GROUP", "SHORT_ANSWER"]).optional() });
export const bulkQuestionsSchema = z.strictObject({
  lessonId: idSchema,
  questions: z.array(questionSchema).min(1).max(100, "Tối đa 100 câu hỏi mỗi lần nhập."),
});
