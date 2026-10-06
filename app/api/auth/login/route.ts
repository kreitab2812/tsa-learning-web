import { cookies } from "next/headers";
import { loginSchema } from "@/features/auth/schemas";
import { prisma } from "@/server/db/prisma";
import { apiHandler } from "@/server/http/handler";
import { readJson } from "@/server/http/request";
import { HttpError } from "@/server/http/errors";
import { consumeLoginAttempt } from "@/server/auth/throttle";
import { verifyPassword, DUMMY_HASH } from "@/server/auth/password";
import { issueSession, SESSION_COOKIE, SESSION_SECONDS, userSelect } from "@/server/auth/session-store";

export const POST = apiHandler(async (request) => {
  const { email, password } = await readJson(request, loginSchema, 4096);
  await consumeLoginAttempt(email);
  const user = await prisma.user.findUnique({ where: { email }, select: { ...userSelect, passwordHash: true } });
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) throw new HttpError(401, "Email hoặc mật khẩu không chính xác.");
  const cookieStore = await cookies();
  const session = await issueSession(user.id, cookieStore.get(SESSION_COOKIE)?.value, user.passwordHash);
  cookieStore.set(SESSION_COOKIE, session.token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", expires: session.expiresAt, maxAge: SESSION_SECONDS,
  });
  return { user: { id: user.id, email: user.email, name: user.name, role: user.role } };
});
