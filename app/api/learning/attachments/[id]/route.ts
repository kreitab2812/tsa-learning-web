import { z } from "zod";
import { NextResponse } from "next/server";
import { apiHandler, type IdContext } from "@/server/http/handler";
import { requireUser } from "@/server/auth/session";
import { attachmentDownload } from "@/server/learning/attachment-access";

export const GET = apiHandler(async (request, context: IdContext) => {
  const id = z.string().min(1).max(250).parse((await context.params).id), query = new URL(request.url).searchParams;
  const options = {
    preview: query.get("preview") === "1", showDrafts: query.get("drafts") === "1",
    unlock: query.get("unlock") ? z.uuid().parse(query.get("unlock")) : null,
    simulated: query.get("done") ? z.array(z.uuid()).max(200).parse(query.get("done")!.split(",")) : [],
  };
  return NextResponse.redirect(await attachmentDownload(await requireUser(), id, options), 302);
});
