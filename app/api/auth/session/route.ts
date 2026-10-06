import { apiHandler } from "@/server/http/handler";
import { getCurrentUser } from "@/server/auth/session";
import { HttpError } from "@/server/http/errors";

export const GET = apiHandler(async () => {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Vui lòng đăng nhập.");
  return { user };
});
