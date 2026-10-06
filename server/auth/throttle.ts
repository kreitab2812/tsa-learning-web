import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { HttpError } from "@/server/http/errors";

// Atomic fixed-window counter shared by all application instances.
export async function consumeLoginAttempt(email: string) {
  const key = createHash("sha256").update(`login:${email}`).digest("hex");
  const rows = await prisma.$queryRaw<{ attempts: number }[]>`
    INSERT INTO "LoginThrottle" ("key", "attempts", "expiresAt")
    VALUES (${key}, 1, CURRENT_TIMESTAMP + INTERVAL '15 minutes')
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "LoginThrottle"."expiresAt" <= CURRENT_TIMESTAMP
        THEN 1 ELSE "LoginThrottle"."attempts" + 1 END,
      "expiresAt" = CASE WHEN "LoginThrottle"."expiresAt" <= CURRENT_TIMESTAMP
        THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes' ELSE "LoginThrottle"."expiresAt" END
    RETURNING "attempts"`;
  if (rows[0].attempts > 10) throw new HttpError(429, "Đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.");
}
