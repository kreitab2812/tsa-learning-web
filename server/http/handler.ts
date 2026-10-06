import "server-only";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { NextResponse } from "next/server";
import { HttpError } from "./errors";
import { assertSameOrigin } from "./request";
import { requireAdmin } from "@/server/auth/session";
import { isWriteConflict } from "@/server/db/write-conflict";

type Handler<C> = (request: Request, context: C) => Promise<unknown>;

export function apiHandler<C = unknown>(handler: Handler<C>, adminOnly = false) {
  return async (request: Request, context: C) => {
    try {
      if (adminOnly) await requireAdmin();
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) assertSameOrigin(request);
      const result = await handler(request, context);
      const response = result instanceof Response ? result : NextResponse.json({ success: true, ...result as object });
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch (error) {
      let status = 500;
      let message = "Không thể xử lý yêu cầu. Vui lòng thử lại.";
      if (error instanceof HttpError) ({ status, message } = error);
      else if (isWriteConflict(error)) { status = 409; message = "Dữ liệu đang được cập nhật. Vui lòng thử lại."; }
      else if (error instanceof z.ZodError) {
        status = 400;
        message = `Dữ liệu không hợp lệ: ${error.issues[0]?.path.join(".") || "body"} — ${error.issues[0]?.message}`;
      } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") { status = 404; message = "Không tìm thấy dữ liệu."; }
        if (error.code === "P2003") { status = 400; message = "Dữ liệu liên kết không tồn tại hoặc đang được sử dụng."; }
        if (["P2002", "P2034"].includes(error.code)) { status = 409; message = "Dữ liệu đã thay đổi hoặc bị trùng. Vui lòng tải lại."; }
      }
      if (status === 500) console.error("API failure", { path: new URL(request.url).pathname, type: error instanceof Error ? error.name : "Unknown" });
      return NextResponse.json({ success: false, message }, {
        status,
        headers: { "Cache-Control": "private, no-store", ...(status === 429 ? { "Retry-After": String(error instanceof HttpError ? error.retryAfter ?? 900 : 900) } : {}) },
      });
    }
  };
}

export const adminHandler = <C = unknown>(handler: Handler<C>) => apiHandler(handler, true);
export type IdContext = { params: Promise<{ id: string }> };
export async function routeId(context: IdContext) {
  return z.uuid().parse((await context.params).id);
}
