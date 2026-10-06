import "server-only";
import { Prisma } from "@prisma/client";
import { subjectOrderSchema, sameIds, type SubjectOrderInput } from "@/features/courses/order-schema";
import { contentTransaction } from "@/server/db/transaction";
import { HttpError } from "@/server/http/errors";

export async function saveSubjectOrder(subjectId: string, input: SubjectOrderInput) {
  const { groups } = subjectOrderSchema.parse(input);
  await contentTransaction(async (tx) => {
    await tx.subject.findUniqueOrThrow({ where: { id: subjectId }, select: { id: true } });
    const chapters = await tx.chapter.findMany({ where: { subjectId }, select: { id: true, parentId: true, order: true }, orderBy: [{ order: "asc" }, { id: "asc" }] });
    const lessonParents = groups.filter((group) => group.kind === "lesson").map((group) => group.parentId!);
    const lessons = lessonParents.length ? await tx.lesson.findMany({
      where: { chapterId: { in: lessonParents }, chapter: { subjectId } },
      select: { id: true, chapterId: true, order: true }, orderBy: [{ order: "asc" }, { id: "asc" }],
    }) : [];
    const updates: Record<"chapter" | "lesson", { id: string; order: number }[]> = { chapter: [], lesson: [] };
    // Validate EVERY group before writing. SERIALIZABLE also detects races with
    // normal create/delete/reorder transactions; retries re-check this snapshot.
    for (const group of groups) {
      const rows = group.kind === "chapter"
        ? chapters.filter((row) => row.parentId === group.parentId)
        : lessons.filter((row) => row.chapterId === group.parentId);
      const currentIds = rows.map((row) => row.id);
      // Accept an already-applied result, e.g. retry after a lost HTTP response.
      if (sameIds(currentIds, group.afterIds)) continue;
      if (!sameIds(currentIds, group.beforeIds)) {
        throw new HttpError(409, "Danh sách đã thay đổi ở nơi khác. Bản tạm vẫn được giữ. Hãy Hủy bỏ rồi mở lại môn để tải dữ liệu mới.");
      }
      const currentOrder = new Map(rows.map((row) => [row.id, row.order]));
      group.afterIds.forEach((id, order) => { if (currentOrder.get(id) !== order) updates[group.kind].push({ id, order }); });
    }
    for (const kind of ["chapter", "lesson"] as const) {
      const table = kind === "chapter" ? Prisma.sql`"Chapter"` : Prisma.sql`"Lesson"`;
      for (let offset = 0; offset < updates[kind].length; offset += 1000) {
        const values = Prisma.join(updates[kind].slice(offset, offset + 1000).map(({ id, order }) => Prisma.sql`(${id}::text, ${order}::int)`));
        await tx.$executeRaw`UPDATE ${table} AS target SET "order" = value."order" FROM (VALUES ${values}) AS value("id", "order") WHERE target."id" = value."id"`;
      }
    }
  });
}
