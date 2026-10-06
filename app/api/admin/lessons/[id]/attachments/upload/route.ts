import { z } from "zod";
import { adminHandler, routeId, type IdContext } from "@/server/http/handler";
import { requireAdmin } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { contentTransaction } from "@/server/db/transaction";
import { HttpError } from "@/server/http/errors";
import { attachmentSection, MAX_ATTACHMENTS } from "@/features/lessons/attachments";
import { addLessonAttachment } from "@/server/admin/attachment-service";
import { driveAccessToken, uploadDriveFile, trashFailedUpload } from "@/server/media/google-drive";
import { readUpload, validateUpload } from "@/server/media/upload-validation";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = adminHandler(async (request, context: IdContext) => {
  const user = await requireAdmin(), lessonId = await routeId(context);
  const query = new URL(request.url).searchParams;
  const name = z.string().trim().min(1).max(200).regex(/^[^/\\\x00-\x1f]+$/).parse(query.get("name"));
  const section = attachmentSection.parse(query.get("section") ?? "DOCUMENTS");
  await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId }, select: { id: true } });
  if (section === "DOCUMENTS" && await prisma.lessonAttachment.count({ where: { lessonId } }) >= MAX_ATTACHMENTS) throw new HttpError(400, "Mỗi bài tối đa 100 tài liệu.");
  const key = `drive-upload:${user.id}`, expiresAt = new Date(Date.now() + 120000);
  await contentTransaction(async tx => {
    const current = await tx.loginThrottle.findUnique({ where: { key } });
    if (current && current.expiresAt > new Date()) throw new HttpError(429, "Đang có một tệp được tải lên. Chờ hoàn tất rồi thử lại.");
    await tx.loginThrottle.upsert({ where: { key }, create: { key, attempts: 1, expiresAt }, update: { expiresAt } });
  });
  try {
    const bytes = await readUpload(request), { kind, mimeType } = validateUpload(name, bytes);
    if (section !== "DOCUMENTS" && kind !== "PDF") throw new HttpError(400, "Tài liệu bên cạnh video phải là PDF.");
    const token = await driveAccessToken(user.id);
    let fileId: string;
    try { fileId = await uploadDriveFile(token, name, mimeType, bytes); }
    catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(504, "Kết nối Drive bị gián đoạn. Kiểm tra Drive trước khi thử lại để tránh tải trùng tệp.");
    }
    try {
      const attachment = await addLessonAttachment(lessonId, { title: name, url: `https://drive.google.com/file/d/${fileId}/view`, kind, section }, { driveFileId: fileId, mimeType, sizeBytes: bytes.length });
      return { attachment, message: "Đã tải lên Drive ở chế độ riêng tư. Hãy cấp quyền xem cho học viên trên Drive." };
    } catch {
      let recovered = false;
      try { recovered = (await trashFailedUpload(token, fileId)).ok; } catch { /* Explain the orphan below. */ }
      throw new HttpError(502, recovered ? "Không gắn được tệp vào bài; tệp vừa tải đã chuyển vào thùng rác Drive và có thể khôi phục." : "Tệp đã lên Drive nhưng chưa gắn vào bài. Kiểm tra Drive và thêm link thủ công để tránh tải trùng.");
    }
  } finally {
    await prisma.loginThrottle.deleteMany({ where: { key, expiresAt } }).catch(() => { /* Lock expires automatically. */ });
  }
});
