import { adminHandler } from "@/server/http/handler";
import { readJson } from "@/server/http/request";
import { courseSchema } from "@/features/content/schemas";
import { createCourse } from "@/server/admin/content-mutations";
import { listAdminCourses } from "@/server/admin/course-queries";
import { pageNumber } from "@/server/http/pagination";

export const GET = adminHandler(async (request) => listAdminCourses(pageNumber(request)));

export const POST = adminHandler(async (request) => ({
  course: await createCourse(await readJson(request, courseSchema)),
}));
