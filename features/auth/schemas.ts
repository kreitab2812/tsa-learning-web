import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(12, "Mật khẩu cần ít nhất 12 ký tự.").max(128);
export const loginSchema = z.strictObject({ email: emailSchema, password: z.string().min(1).max(128) });
export const createUserSchema = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1).max(100),
  role: z.enum(["ADMIN", "STUDENT"]),
});
