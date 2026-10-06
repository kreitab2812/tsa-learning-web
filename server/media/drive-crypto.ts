import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { HttpError } from "@/server/http/errors";

function key() {
  const value = process.env.GOOGLE_DRIVE_TOKEN_KEY ?? "";
  if (!/^[a-f\d]{64}$/i.test(value)) throw new HttpError(503, "Chưa cấu hình khóa bảo vệ kết nối Google Drive.");
  return Buffer.from(value, "hex");
}
export function sealDriveSecret(value: string) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url");
}
export function openDriveSecret(value: string) {
  try {
    const data = Buffer.from(value, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key(), data.subarray(0, 12));
    decipher.setAuthTag(data.subarray(12, 28));
    return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8");
  } catch { throw new HttpError(400, "Kết nối Google Drive không hợp lệ. Vui lòng kết nối lại."); }
}
