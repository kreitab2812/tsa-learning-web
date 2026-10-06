import "server-only";
import { Prisma } from "@prisma/client";
import { contentTransaction } from "@/server/db/transaction";
import { HttpError } from "@/server/http/errors";

export function duplicateQuestion(id: string) {
  return contentTransaction(async tx => {
    const question = await tx.question.findUniqueOrThrow({ where: { id } });
    const last = await tx.question.aggregate({ where: { lessonId: question.lessonId }, _max: { order: true } });
    return tx.question.create({ data: { lessonId: question.lessonId, order: (last._max.order ?? -1) + 1,
      type: question.type, content: question.content, imageUrl: question.imageUrl, options: question.options ?? Prisma.DbNull,
      correctAnswer: question.correctAnswer, explanation: question.explanation } });
  });
}

/** Move within the lesson, including across paginated admin pages. Serializable transaction avoids races. */
export function moveQuestion(id: string, direction: "up" | "down") {
  return contentTransaction(async tx => {
    const current = await tx.question.findUniqueOrThrow({ where: { id } });
    const siblings = await tx.question.findMany({ where: { lessonId: current.lessonId }, select: { id: true, order: true }, orderBy: [{ order: "asc" }, { id: "asc" }] });
    const index = siblings.findIndex(item => item.id === id), target = index + (direction === "up" ? -1 : 1);
    if (target < 0 || target >= siblings.length) throw new HttpError(400, "Câu hỏi đã ở đầu/cuối bài.");
    [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
    const changed = siblings.flatMap((item, order) => item.order === order ? [] : [{ id: item.id, order }]);
    for (let offset = 0; offset < changed.length; offset += 1000) {
      const values = Prisma.join(changed.slice(offset, offset + 1000).map(item => Prisma.sql`(${item.id}::text, ${item.order}::int)`));
      await tx.$executeRaw`UPDATE "Question" AS target SET "order" = value."order" FROM (VALUES ${values}) AS value("id", "order") WHERE target."id" = value."id"`;
    }
  });
}
