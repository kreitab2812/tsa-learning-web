import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminHandler } from "@/server/http/handler";
import { requireAdmin } from "@/server/auth/session";
import { HttpError } from "@/server/http/errors";
import { prisma } from "@/server/db/prisma";
import { driveConfig, googleToken, DRIVE_SCOPE, DRIVE_STATE_COOKIE } from "@/server/media/google-drive";
import { openDriveSecret, sealDriveSecret } from "@/server/media/drive-crypto";

export const GET = adminHandler(async request => {
  const user = await requireAdmin(), jar = await cookies(), config = driveConfig();
  const cookie = jar.get(DRIVE_STATE_COOKIE)?.value;
  jar.set(DRIVE_STATE_COOKIE, "", { maxAge: 0, path: "/api/admin/drive", httpOnly: true, sameSite: "lax", secure: config.redirect.startsWith("https:") });
  if (!cookie) throw new HttpError(400, "Phiên kết nối Drive hết hạn. Quay lại bài học và kết nối lại.");
  const state = z.object({ state: z.string(), verifier: z.string(), userId: z.uuid(), lessonId: z.uuid(), expires: z.number() }).parse(JSON.parse(openDriveSecret(cookie)));
  const query = new URL(request.url).searchParams;
  if (state.userId !== user.id || state.expires < Date.now() || query.get("state") !== state.state) throw new HttpError(403, "Không xác nhận được phiên kết nối Drive.");
  const target = new URL(`/dashboard/lessons/${state.lessonId}/questions?tab=documents`, config.redirect);
  try {
    const code = query.get("code");
    if (query.has("error") || !code) throw new Error("Consent denied");
    const tokens = await googleToken({ grant_type: "authorization_code", code, redirect_uri: config.redirect, code_verifier: state.verifier });
    if (!tokens.refresh_token || !tokens.scope?.split(" ").includes(DRIVE_SCOPE)) throw new Error("Missing Drive consent");
    const response = await fetch("https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)", { headers: { Authorization: `Bearer ${tokens.access_token}` }, signal: AbortSignal.timeout(10000), cache: "no-store" });
    if (!response.ok) throw new Error("Account unavailable");
    const account = await response.json() as { user?: { emailAddress?: string } };
    const email = z.email().parse(account.user?.emailAddress);
    const data = { email, refreshToken: sealDriveSecret(tokens.refresh_token) };
    await prisma.googleDriveConnection.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
    target.searchParams.set("drive", "connected");
  } catch { target.searchParams.set("drive", "failed"); }
  return NextResponse.redirect(target, 303);
});
