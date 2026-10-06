import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findSessionUser, SESSION_COOKIE } from "./session-store";
import { HttpError } from "@/server/http/errors";

// React memoizes only within a server render, never across user sessions.
export const getCurrentUser = cache(async () =>
  findSessionUser((await cookies()).get(SESSION_COOKIE)?.value)
);

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  if (user.role !== "ADMIN") throw new HttpError(403, "Bạn không có quyền quản trị.");
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  return user;
}

export async function requirePageUser(adminOnly = false) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (adminOnly && user.role !== "ADMIN") redirect("/home");
  return user;
}
