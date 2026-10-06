import { z } from "zod";

export function pageNumber(request: Request) {
  return z.coerce.number().int().min(1).max(100000).parse(new URL(request.url).searchParams.get("page") ?? 1);
}
export const PAGE_SIZE = 20;
