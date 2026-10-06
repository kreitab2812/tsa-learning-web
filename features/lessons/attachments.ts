import { z } from "zod";
import { getDriveFile } from "@/lib/media";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_ATTACHMENTS = 100;
export const attachmentSection = z.enum(["THEORY", "PRACTICE", "DOCUMENTS"]);
export const attachmentKind = z.enum(["PDF", "WORD", "ZIP"]);
export const attachmentInput = z.strictObject({
  title: z.string().trim().min(1).max(250),
  url: z.string().max(2048).refine(value => !!getDriveFile(value), "Cần link tệp Google Drive, không phải link thư mục."),
  section: attachmentSection.default("DOCUMENTS"), kind: attachmentKind.default("PDF"),
  allowDownload: z.boolean().default(true), watermark: z.boolean().default(false),
}).refine(value => value.section === "DOCUMENTS" || value.kind === "PDF", "Tài liệu đi kèm video phải là PDF.")
  .refine(value => !value.watermark || value.kind === "PDF", "Watermark chỉ áp dụng màn xem PDF.");
export const attachmentPatch = z.strictObject({
  id: z.string().min(1).max(250), title: z.string().trim().min(1).max(250),
  allowDownload: z.boolean(), watermark: z.boolean(),
});
export type LessonAttachmentView = {
  id: string; title: string; url: string; section: "THEORY" | "PRACTICE" | "DOCUMENTS";
  kind: string; allowDownload: boolean; watermark: boolean; sourceKey: string | null;
  sizeBytes: number | null; mimeType: string | null;
};
