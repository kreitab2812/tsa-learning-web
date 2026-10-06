import { prisma } from "../server/db/prisma";

async function main() {
  const now = new Date();
  const [sessions, throttles] = await prisma.$transaction([
    prisma.session.deleteMany({ where: { expiresAt: { lte: now } } }),
    prisma.loginThrottle.deleteMany({ where: { expiresAt: { lte: now } } }),
  ]);
  console.log({ expiredSessionsDeleted: sessions.count, expiredThrottlesDeleted: throttles.count });
}
main().catch(() => { console.error("Không thể dọn dữ liệu auth hết hạn."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
