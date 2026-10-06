import { adminHandler, routeId, type IdContext } from "@/server/http/handler";
import { revokeStudentSessions } from "@/server/admin/student-accounts";

export const DELETE = adminHandler(async (_request, context: IdContext) => ({ result: await revokeStudentSessions(await routeId(context)) }));
