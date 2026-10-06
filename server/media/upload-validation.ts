import "server-only";
import { MAX_UPLOAD_BYTES } from "@/features/lessons/attachments";
import { HttpError } from "@/server/http/errors";

export async function readUpload(request: Request) {
  if (Number(request.headers.get("content-length")) > MAX_UPLOAD_BYTES) throw new HttpError(413, "Tệp vượt giới hạn 4 MB.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Thiếu nội dung tệp.");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > MAX_UPLOAD_BYTES) { await reader.cancel(); throw new HttpError(413, "Tệp vượt giới hạn 4 MB."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  if (!size) throw new HttpError(400, "Tệp rỗng.");
  return Buffer.concat(chunks);
}

// Signature checks are not an antivirus scan. ZIP contents are never extracted.
export function validateUpload(name: string, bytes: Buffer) {
  if (!bytes.length || bytes.length > MAX_UPLOAD_BYTES) throw new HttpError(413, "Tệp phải có nội dung và không quá 4 MB.");
  const ext = name.split(".").pop()?.toLowerCase();
  const zip = bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) || bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (ext === "pdf" && bytes.subarray(0, 5).toString() === "%PDF-") return { kind: "PDF" as const, mimeType: "application/pdf" };
  if (ext === "doc" && bytes.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) return { kind: "WORD" as const, mimeType: "application/msword" };
  if (ext === "docx" && zip && bytes.includes(Buffer.from("word/document.xml")) && bytes.includes(Buffer.from("[Content_Types].xml"))) return { kind: "WORD" as const, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
  if (ext === "zip" && zip) return { kind: "ZIP" as const, mimeType: "application/zip" };
  throw new HttpError(400, "Chỉ nhận PDF, DOC, DOCX hoặc ZIP có nội dung khớp định dạng tệp.");
}
