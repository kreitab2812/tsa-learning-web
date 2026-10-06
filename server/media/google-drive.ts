import "server-only";
import { randomBytes } from "node:crypto";
import { HttpError } from "@/server/http/errors";
import { openDriveSecret } from "./drive-crypto";

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
export const DRIVE_STATE_COOKIE = "tsa-drive-connect";

export function driveConfigured() {
  return !!(process.env.GOOGLE_DRIVE_CLIENT_ID && process.env.GOOGLE_DRIVE_CLIENT_SECRET
    && process.env.GOOGLE_DRIVE_REDIRECT_URI && /^[a-f\d]{64}$/i.test(process.env.GOOGLE_DRIVE_TOKEN_KEY ?? ""));
}
export function driveConfig() {
  if (!driveConfigured()) throw new HttpError(503, "Chưa cấu hình Google Drive. Xem hướng dẫn kết nối trong Document Hub.");
  const redirect = new URL(process.env.GOOGLE_DRIVE_REDIRECT_URI!);
  if (redirect.pathname !== "/api/admin/drive/callback" || redirect.search || redirect.hash || redirect.username || redirect.password ||
    (redirect.protocol !== "https:" && !(redirect.protocol === "http:" && ["localhost", "127.0.0.1"].includes(redirect.hostname)))) throw new HttpError(503, "Địa chỉ callback Google Drive không hợp lệ.");
  if (process.env.APP_ORIGIN && redirect.origin !== process.env.APP_ORIGIN) throw new HttpError(503, "Callback Google Drive phải cùng APP_ORIGIN.");
  return { clientId: process.env.GOOGLE_DRIVE_CLIENT_ID!, clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET!, redirect: redirect.href };
}

export async function googleToken(parameters: Record<string, string>) {
  const config = driveConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(15000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, ...parameters }),
  });
  if (!response.ok) throw new HttpError(502, "Google từ chối kết nối hoặc quyền đã hết hạn. Hãy kết nối lại Drive.");
  const data = await response.json() as { access_token?: string; refresh_token?: string; scope?: string };
  if (!data.access_token) throw new HttpError(502, "Google chưa cấp quyền truy cập.");
  return data;
}

export async function driveAccessToken(userId: string) {
  const { prisma } = await import("@/server/db/prisma");
  const connection = await prisma.googleDriveConnection.findUnique({ where: { userId } });
  if (!connection) throw new HttpError(409, "Hãy kết nối Google Drive trước khi tải tệp.");
  return (await googleToken({ grant_type: "refresh_token", refresh_token: openDriveSecret(connection.refreshToken) })).access_token!;
}

export async function uploadDriveFile(accessToken: string, name: string, mimeType: string, bytes: Buffer) {
  const boundary = `tsa_${randomBytes(16).toString("hex")}`;
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, description: "Tài liệu bài học TSA LMS" })}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    bytes, Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": `multipart/related; boundary=${boundary}` },
    body: new Uint8Array(body), signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new HttpError(502, "Không tải được lên Drive. Kiểm tra dung lượng, quyền kết nối và thử lại.");
  const file = await response.json() as { id?: string };
  if (!file.id || !/^[\w-]+$/.test(file.id)) throw new HttpError(502, "Drive trả về thông tin tệp không hợp lệ.");
  return file.id;
}

// Recovery only for the exact file created in this request, never an existing file.
export async function trashFailedUpload(accessToken: string, id: string) {
  return fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}`, {
    method: "PATCH", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ trashed: true }), signal: AbortSignal.timeout(10000),
  });
}
