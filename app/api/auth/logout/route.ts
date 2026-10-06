import { cookies } from "next/headers";
import { apiHandler } from "@/server/http/handler";
import { revokeSession, SESSION_COOKIE } from "@/server/auth/session-store";

export const POST = apiHandler(async () => {
  const cookieStore = await cookies();
  await revokeSession(cookieStore.get(SESSION_COOKIE)?.value);
  cookieStore.delete(SESSION_COOKIE);
  return {};
});
