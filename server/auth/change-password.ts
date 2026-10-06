import "server-only";
import { prisma } from "@/server/db/prisma";
import { hashPassword, verifyPassword } from "./password";
import { consumeLoginAttempt } from "./throttle";
import { HttpError } from "@/server/http/errors";

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  await consumeLoginAttempt(`password:${userId}`);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
  if (!await verifyPassword(currentPassword, user.passwordHash)) throw new HttpError(400, "Mật khẩu hiện tại không đúng.");
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction(async (tx) => {
    const changed = await tx.user.updateMany({ where: { id: userId, passwordHash: user.passwordHash }, data: { passwordHash } });
    if (!changed.count) throw new HttpError(409, "Mật khẩu vừa thay đổi. Hãy đăng nhập lại.");
    await tx.session.deleteMany({ where: { userId } });
  }, { maxWait: 10000, timeout: 20000 });
}
