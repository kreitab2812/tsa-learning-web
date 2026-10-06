import "server-only";
import { z } from "zod";
import { HttpError } from "@/server/http/errors";
import type { AccessOptions } from "./service";

export function parsePreviewParams(query: Record<string, string | string[] | undefined>): AccessOptions {
  const text = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const done = text(query.done);
  const parsed = z.object({ unlock: z.uuid().nullable(), simulated: z.array(z.uuid()).max(200) }).safeParse({
    unlock: text(query.unlock) || null, simulated: done ? done.split(",") : [],
  });
  if (!parsed.success) throw new HttpError(400, "Dữ liệu Preview không hợp lệ. Hãy mở lại từ môn học.");
  return { preview: text(query.preview) === "1", showDrafts: text(query.drafts) === "1", ...parsed.data };
}
