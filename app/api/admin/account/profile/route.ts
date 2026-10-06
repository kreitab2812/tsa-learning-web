import { adminHandler } from "@/server/http/handler";
import { requireAdmin } from "@/server/auth/session";
import { readJson } from "@/server/http/request";
import { emailSchema } from "@/features/auth/schemas";
import { prisma } from "@/server/db/prisma";
import { z } from "zod";

const schema = z.strictObject({ name: z.string().trim().min(1).max(100), email: emailSchema });
export const PATCH = adminHandler(async request => {
  const user = await requireAdmin();
  return { user: await prisma.user.update({ where: { id: user.id }, data: await readJson(request, schema, 4096), select: { id: true, name: true, email: true, role: true } }) };
});

