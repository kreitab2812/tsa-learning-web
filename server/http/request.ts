import { z } from "zod";
import { HttpError } from "./errors";

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (process.env.NODE_ENV === "production" && !process.env.APP_ORIGIN) throw new HttpError(503, "Máy chủ chưa cấu hình APP_ORIGIN.");
  const url = new URL(request.url);
  // Next's internal request URL can normalize 127.0.0.1 to localhost in dev.
  // Production must use a pinned public origin rather than forwarded headers.
  const expected = process.env.APP_ORIGIN || `${url.protocol}//${request.headers.get("host") || url.host}`;
  if (request.headers.get("sec-fetch-site") === "cross-site" || origin !== expected) {
    throw new HttpError(403, "Yêu cầu phải được gửi từ chính website này.");
  }
}

// Count bytes while streaming, including requests without Content-Length.
export async function readJson<T>(request: Request, schema: z.ZodType<T>, limit = 64 * 1024): Promise<T> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new HttpError(415, "Yêu cầu cần có định dạng application/json.");
  }
  if (Number(request.headers.get("content-length")) > limit) {
    throw new HttpError(413, "Dữ liệu gửi lên quá lớn.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Thiếu dữ liệu JSON.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new HttpError(413, "Dữ liệu gửi lên quá lớn.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  let value: unknown;
  try {
    value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "JSON không hợp lệ.");
  }
  return schema.parse(value);
}
