import { randomBytes } from "node:crypto";
import { mkdir, open, unlink } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { parseArgs } from "node:util";
import { createUserSchema } from "../features/auth/schemas";
import { hashPassword } from "../server/auth/password";
import { prisma } from "../server/db/prisma";

async function main() {
  const { values } = parseArgs({ options: {
    email: { type: "string" }, name: { type: "string" },
    role: { type: "string", default: "STUDENT" },
  } });
  const input = createUserSchema.parse({
    email: values.email, name: values.name, role: values.role,
    password: process.env.INITIAL_USER_PASSWORD || randomBytes(24).toString("base64url"),
  });
  if (await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } })) {
    throw new Error("Email đã tồn tại. Không thay đổi tài khoản/mật khẩu hiện có.");
  }
  const path = resolve(".local", `credentials-${Date.now()}-${randomBytes(4).toString("hex")}.txt`);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const file = await open(path, "wx", 0o600);
  try {
    await file.writeFile(`Email: ${input.email}\nMật khẩu: ${input.password}\nVai trò: ${input.role}\nGiữ riêng tệp này; không commit hoặc chia sẻ.\n`);
    await file.close();
    await prisma.user.create({ data: {
      email: input.email, name: input.name, role: input.role,
      passwordHash: await hashPassword(input.password),
    } });
  } catch (error) {
    await file.close().catch(() => {});
    await unlink(path);
    throw error;
  }
  console.log(`Đã tạo ${input.role}: ${input.email}\nThông tin đăng nhập lưu riêng tại: ${path}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Không thể tạo tài khoản.");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
