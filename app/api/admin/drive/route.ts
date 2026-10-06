import { adminHandler } from "@/server/http/handler";
import { requireAdmin } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { driveConfigured } from "@/server/media/google-drive";

export const GET = adminHandler(async () => {
  const user = await requireAdmin();
  const connection = await prisma.googleDriveConnection.findUnique({ where: { userId: user.id }, select: { email: true } });
  return { configured: driveConfigured(), connected: !!connection, email: connection?.email ?? null };
});

export const DELETE = adminHandler(async () => {
  const user = await requireAdmin();
  await prisma.googleDriveConnection.deleteMany({ where: { userId: user.id } });
  return {}; // Only forget this LMS connection. Existing Drive files are retained.
});
