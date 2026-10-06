import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { adminHandler } from "@/server/http/handler";
import { readJson } from "@/server/http/request";
import { requireAdmin } from "@/server/auth/session";
import { driveConfig, DRIVE_SCOPE, DRIVE_STATE_COOKIE } from "@/server/media/google-drive";
import { sealDriveSecret } from "@/server/media/drive-crypto";

export const POST = adminHandler(async request => {
  const user = await requireAdmin();
  const { lessonId } = await readJson(request, z.strictObject({ lessonId: z.uuid() }));
  const config = driveConfig(), state = randomBytes(32).toString("base64url"), verifier = randomBytes(32).toString("base64url");
  (await cookies()).set(DRIVE_STATE_COOKIE, sealDriveSecret(JSON.stringify({ state, verifier, userId: user.id, lessonId, expires: Date.now() + 600000 })), {
    httpOnly: true, secure: config.redirect.startsWith("https:"), sameSite: "lax", path: "/api/admin/drive", maxAge: 600,
  });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirect, response_type: "code", scope: DRIVE_SCOPE,
    access_type: "offline", prompt: "consent", state, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" }).toString();
  return { url: url.href };
});
