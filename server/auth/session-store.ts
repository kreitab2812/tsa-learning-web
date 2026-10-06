import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import type { SessionUser } from "@/features/auth/types";
import { HttpError } from "@/server/http/errors";

export const SESSION_COOKIE = "tsa_session";
export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export const userSelect = { id: true, email: true, name: true, role: true } as const;

export async function findSessionUser(token: string | undefined): Promise<SessionUser | null> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const [user] = await prisma.$queryRaw<SessionUser[]>`
    SELECT u."id", u."email", u."name", u."role"
    FROM "Session" s JOIN "User" u ON u."id" = s."userId"
    WHERE s."tokenHash" = ${tokenHash(token)} AND s."expiresAt" > CURRENT_TIMESTAMP`;
  return user ?? null;
}

export async function issueSession(userId: string, previousToken?: string, expectedPasswordHash?: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  await prisma.$transaction(async (tx) => {
    // Serialize with password changes so an in-flight old-password login cannot
    // create a fresh session after changePassword has revoked the old sessions.
    const [current] = await tx.$queryRaw<{ passwordHash: string }[]>`SELECT "passwordHash" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    if (!current || (expectedPasswordHash && current.passwordHash !== expectedPasswordHash)) throw new HttpError(401, "Thông tin đăng nhập đã thay đổi. Vui lòng thử lại.");
    await tx.session.deleteMany({ where: { tokenHash: tokenHash(previousToken ?? "") } });
    await tx.session.create({ data: { userId, tokenHash: tokenHash(token), expiresAt } });
  }, { maxWait: 10000, timeout: 20000 });
  return { token, expiresAt };
}

export async function revokeSession(token: string | undefined) {
  if (token) await prisma.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
}
