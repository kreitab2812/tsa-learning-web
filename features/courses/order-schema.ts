import { z } from "zod";

export const sameIds = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((id, index) => id === b[index]);

const groupSchema = z.strictObject({
  kind: z.enum(["chapter", "lesson"]),
  parentId: z.uuid().nullable(),
  beforeIds: z.array(z.uuid()).min(2).max(2000),
  afterIds: z.array(z.uuid()).min(2).max(2000),
}).superRefine((group, ctx) => {
  const before = new Set(group.beforeIds), after = new Set(group.afterIds);
  if (before.size !== group.beforeIds.length || after.size !== group.afterIds.length ||
    before.size !== after.size || group.afterIds.some((id) => !before.has(id))) {
    ctx.addIssue({ code: "custom", message: "Thứ tự mới phải chứa đủ mỗi mục đúng một lần; không được chuyển nhóm." });
  }
  if (group.kind === "lesson" && !group.parentId) ctx.addIssue({ code: "custom", message: "Bài học phải thuộc một cụm." });
});

export const subjectOrderSchema = z.strictObject({ groups: z.array(groupSchema).min(1).max(200) })
  .superRefine(({ groups }, ctx) => {
    const keys = groups.map((group) => `${group.kind}:${group.parentId ?? "root"}`);
    if (new Set(keys).size !== keys.length) ctx.addIssue({ code: "custom", message: "Không được gửi trùng nhóm sắp xếp." });
  });
export type OrderGroup = z.infer<typeof groupSchema>;
export type SubjectOrderInput = z.infer<typeof subjectOrderSchema>;
