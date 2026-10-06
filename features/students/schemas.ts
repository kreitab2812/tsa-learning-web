import { z } from "zod";
import { emailSchema, passwordSchema } from "@/features/auth/schemas";

export const studentCreateSchema = z.strictObject({
  name: z.string().trim().min(1, "Cần nhập tên học sinh.").max(100),
  email: emailSchema,
  password: passwordSchema,
});
export const studentPatchSchema = studentCreateSchema.pick({ name: true, email: true });
export const studentPasswordSchema = z.strictObject({ password: passwordSchema });

