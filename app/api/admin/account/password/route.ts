import { cookies } from "next/headers";
import { z } from "zod";
import { adminHandler } from "@/server/http/handler";
import { readJson } from "@/server/http/request";
import { requireAdmin } from "@/server/auth/session";
import { SESSION_COOKIE } from "@/server/auth/session-store";
import { changePassword } from "@/server/auth/change-password";

export const POST = adminHandler(async (request) => {
  const user = await requireAdmin();
  const data = await readJson(request, z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(12).max(128) }).strict(), 4096);
  await changePassword(user.id, data.currentPassword, data.newPassword);
  (await cookies()).delete(SESSION_COOKIE);
  return {};
});
