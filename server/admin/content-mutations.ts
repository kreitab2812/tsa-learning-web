import "server-only";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import * as s from "@/features/content/schemas";
import { contentTransaction } from "@/server/db/transaction";
import { HttpError } from "@/server/http/errors";
import { syncLessonAttachments } from "./lesson-attachments";
import { MAX_ATTACHMENTS } from "@/features/lessons/attachments";

async function appendLessonDocuments(tx: Prisma.TransactionClient, lessonId: string, documents: { title: string; url: string }[] = []) {
  const unique = [...new Map(documents.map(document => [document.url, document])).values()];
  if (!unique.length) return;
  const existing = await tx.lessonAttachment.findMany({ where: { lessonId, section: "DOCUMENTS", url: { in: unique.map(document => document.url) } }, select: { url: true } });
  const existingUrls = new Set(existing.map(document => document.url));
  const pending = unique.filter(document => !existingUrls.has(document.url));
  if (!pending.length) return;
  const [count, last] = await Promise.all([
    tx.lessonAttachment.count({ where: { lessonId } }),
    tx.lessonAttachment.aggregate({ where: { lessonId }, _max: { order: true } }),
  ]);
  if (count + pending.length > MAX_ATTACHMENTS) throw new HttpError(400, "Mỗi bài tối đa 100 tài liệu.");
  const start = (last._max.order ?? -1) + 1;
  await tx.lessonAttachment.createMany({ data: pending.map((document, index) => ({
    lessonId, title: document.title, url: document.url, section: "DOCUMENTS", kind: "PDF", order: start + index,
  })) });
}

export function createCourse(input: z.input<typeof s.courseSchema>) {
  const data = s.courseSchema.parse(input);
  return contentTransaction((tx) => tx.course.create({ data }));
}
export function updateCourse(id: string, input: z.input<typeof s.coursePatchSchema>) {
  const patch = s.coursePatchSchema.parse(input);
  return contentTransaction(async (tx) => {
    const current = await tx.course.findUniqueOrThrow({ where: { id } });
    const data = s.courseSchema.parse({
      title: current.title, description: current.description, thumbnailUrl: current.thumbnailUrl,
      badge: current.badge, status: current.status, publishAt: current.publishAt?.toISOString() ?? null,
      showCountdown: current.showCountdown, ...patch,
    });
    return tx.course.update({ where: { id }, data });
  });
}
export function createStage(input: z.input<typeof s.stageCreateSchema>) {
  const data = s.stageCreateSchema.parse(input);
  return contentTransaction(async (tx) => {
    const last = await tx.stage.aggregate({ where: { courseId: data.courseId }, _max: { order: true } });
    return tx.stage.create({ data: { ...data, order: (last._max.order ?? -1) + 1 } });
  });
}
export function updateStage(id: string, input: z.input<typeof s.stagePatchSchema>) {
  const patch = s.stagePatchSchema.parse(input);
  return contentTransaction(async (tx) => {
    const current = await tx.stage.findUniqueOrThrow({ where: { id } });
    const data = s.stageSchema.parse({
      title: current.title, description: current.description, color: current.color,
      timeframe: current.timeframe, accessMode: current.accessMode,
      unlockAt: current.unlockAt?.toISOString() ?? null, ...patch,
    });
    return tx.stage.update({ where: { id }, data });
  });
}
export function createSubject(input: z.input<typeof s.subjectCreateSchema>) {
  const data = s.subjectCreateSchema.parse(input);
  return contentTransaction(async (tx) => {
    const last = await tx.subject.aggregate({ where: { stageId: data.stageId }, _max: { order: true } });
    return tx.subject.create({ data: { ...data, order: (last._max.order ?? -1) + 1 } });
  });
}
export function updateSubject(id: string, input: z.input<typeof s.subjectPatchSchema>) {
  const data = s.subjectPatchSchema.parse(input);
  return contentTransaction((tx) => tx.subject.update({ where: { id }, data }));
}
export function createChapter(input: z.input<typeof s.chapterCreateSchema>) {
  const data = s.chapterCreateSchema.parse(input);
  return contentTransaction(async (tx) => {
    if (data.parentId) {
      const parent = await tx.chapter.findUniqueOrThrow({ where: { id: data.parentId } });
      if (parent.subjectId !== data.subjectId) throw new HttpError(400, "Cụm cha phải thuộc cùng môn học.");
    }
    const last = await tx.chapter.aggregate({
      where: { subjectId: data.subjectId, parentId: data.parentId ?? null }, _max: { order: true },
    });
    return tx.chapter.create({ data: { ...data, order: (last._max.order ?? -1) + 1 } });
  });
}
export function updateChapter(id: string, input: z.input<typeof s.chapterPatchSchema>) {
  const patch = s.chapterPatchSchema.parse(input);
  return contentTransaction(async (tx) => {
    const current = await tx.chapter.findUniqueOrThrow({ where: { id } });
    const data = s.chapterSchema.parse({
      title: current.title, description: current.description, status: current.status,
      openAt: current.openAt?.toISOString() ?? null, closeAt: current.closeAt?.toISOString() ?? null,
      ...patch,
    });
    return tx.chapter.update({ where: { id }, data });
  });
}
export function createLesson(input: z.input<typeof s.lessonCreateSchema>) {
  const { additionalDocuments, ...data } = s.lessonCreateSchema.parse(input);
  return contentTransaction(async (tx) => {
    const last = await tx.lesson.aggregate({ where: { chapterId: data.chapterId }, _max: { order: true } });
    const lesson = await tx.lesson.create({ data: { ...data, order: (last._max.order ?? -1) + 1 } });
    await syncLessonAttachments(tx, lesson, data);
    await appendLessonDocuments(tx, lesson.id, additionalDocuments);
    return lesson;
  });
}
export function updateLesson(id: string, input: z.input<typeof s.lessonPatchSchema>) {
  const { additionalDocuments, ...data } = s.lessonPatchSchema.parse(input);
  return contentTransaction(async (tx) => {
    const lesson = await tx.lesson.update({ where: { id }, data });
    await syncLessonAttachments(tx, lesson, data);
    await appendLessonDocuments(tx, lesson.id, additionalDocuments);
    return lesson;
  });
}
function questionData(data: z.output<typeof s.questionSchema>) {
  return { ...data, options: data.options ?? Prisma.DbNull };
}
export function createQuestion(input: z.input<typeof s.questionCreateSchema>) {
  const { lessonId, ...data } = s.questionCreateSchema.parse(input);
  return contentTransaction(async (tx) => {
    const last = await tx.question.aggregate({ where: { lessonId }, _max: { order: true } });
    return tx.question.create({ data: { ...questionData(data), lessonId, order: (last._max.order ?? -1) + 1 } });
  });
}
export function updateQuestion(id: string, input: z.input<typeof s.questionPatchSchema>) {
  const patch = s.questionPatchSchema.parse(input);
  return contentTransaction(async (tx) => {
    const current = await tx.question.findUniqueOrThrow({ where: { id } });
    const data = s.questionSchema.parse({
      type: current.type, content: current.content, imageUrl: current.imageUrl,
      options: current.options, correctAnswer: current.correctAnswer, explanation: current.explanation, ...patch,
    });
    return tx.question.update({ where: { id }, data: questionData(data) });
  });
}
export function importQuestions(input: z.input<typeof s.bulkQuestionsSchema>) {
  const { lessonId, questions } = s.bulkQuestionsSchema.parse(input);
  return contentTransaction(async (tx) => {
    const last = await tx.question.aggregate({ where: { lessonId }, _max: { order: true } });
    const start = (last._max.order ?? -1) + 1;
    const created = await tx.question.createManyAndReturn({
      data: questions.map((question, index) => ({ ...questionData(question), lessonId, order: start + index })),
    });
    return created.sort((a, b) => a.order - b.order);
  });
}

export type ContentKind = "course" | "stage" | "subject" | "chapter" | "lesson" | "question";
export function deleteContent(kind: ContentKind, id: string) {
  return contentTransaction(async (tx) => {
    // Explicit dispatch keeps each generated Prisma delegate type checked.
    switch (kind) {
      case "course": await tx.course.delete({ where: { id } }); break;
      case "stage": await tx.stage.delete({ where: { id } }); break;
      case "subject": await tx.subject.delete({ where: { id } }); break;
      case "chapter": await tx.chapter.delete({ where: { id } }); break;
      case "lesson": await tx.lesson.delete({ where: { id } }); break;
      case "question": await tx.question.delete({ where: { id } }); break;
    }
  });
}

export function reorderContent(kind: "chapter" | "lesson", input: z.input<typeof s.reorderSchema>) {
  const { id, direction } = s.reorderSchema.parse(input);
  return contentTransaction(async (tx) => {
    if (kind === "chapter") {
      const current = await tx.chapter.findUniqueOrThrow({ where: { id } });
      const siblings = await tx.chapter.findMany({
        where: { subjectId: current.subjectId, parentId: current.parentId },
        select: { id: true, order: true }, orderBy: [{ order: "asc" }, { id: "asc" }],
      });
      const reordered = move(siblings, id, direction);
      await persistOrder(tx, "Chapter", reordered);
    } else {
      const current = await tx.lesson.findUniqueOrThrow({ where: { id } });
      const siblings = await tx.lesson.findMany({
        where: { chapterId: current.chapterId }, select: { id: true, order: true },
        orderBy: [{ order: "asc" }, { id: "asc" }],
      });
      const reordered = move(siblings, id, direction);
      await persistOrder(tx, "Lesson", reordered);
    }
  });
}

async function persistOrder(tx: Prisma.TransactionClient, table: "Chapter" | "Lesson", items: { id: string; order: number }[]) {
  const changed = items.flatMap((item, order) => order === item.order ? [] : [{ id: item.id, order }]);
  // Reindex gaps in batches, not one network round-trip per sibling.
  // Identifiers come exclusively from this internal whitelist; values are bound.
  const identifier = table === "Chapter" ? Prisma.sql`"Chapter"` : Prisma.sql`"Lesson"`;
  for (let offset = 0; offset < changed.length; offset += 1000) {
    const values = Prisma.join(changed.slice(offset, offset + 1000).map((item) => Prisma.sql`(${item.id}::text, ${item.order}::int)`));
    await tx.$executeRaw`UPDATE ${identifier} AS target SET "order" = value."order" FROM (VALUES ${values}) AS value("id", "order") WHERE target."id" = value."id"`;
  }
}

function move<T extends { id: string }>(items: T[], id: string, direction: "up" | "down") {
  const index = items.findIndex((item) => item.id === id);
  const target = index + (direction === "up" ? -1 : 1);
  if (index < 0 || target < 0 || target >= items.length) throw new HttpError(400, "Đã ở vị trí đầu/cuối.");
  [items[index], items[target]] = [items[target], items[index]];
  return items;
}
