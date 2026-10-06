import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { prisma } from "../../server/db/prisma";
import { hashPassword } from "../../server/auth/password";
import { issueSession, SESSION_COOKIE } from "../../server/auth/session-store";

test("HTTP admin: auth, CSRF, CRUD, pagination, password and logout", { skip: process.env.RUN_HTTP_TESTS !== "1", timeout: 240000 }, async () => {
  assert.equal(process.env.ALLOW_INTEGRATION_TESTS, "1");
  const base = process.env.TEST_BASE_URL || "http://localhost:3000";
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "HTTP tests only target localhost.");
  const email = `http-${randomUUID()}@example.invalid`;
  const password = randomUUID();
  let userId: string | undefined, courseId: string | undefined;
  let cookie = "";
  async function request(path: string, method = "GET", body?: unknown, expected = 200, auth = cookie, origin = base) {
    const response = await fetch(`${base}${path}`, { method, redirect: "manual", headers: {
      Cookie: auth, Origin: origin, ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    }, body: body === undefined ? undefined : JSON.stringify(body) });
    assert.equal(response.status, expected, `${method} ${path}: expected ${expected}, received ${response.status}`);
    return response;
  }
  try {
    const user = await prisma.user.create({ data: { email, role: "ADMIN", passwordHash: await hashPassword(password) } });
    userId = user.id;
    const id = randomUUID();
    const routes: [string, string][] = [
      ["courses", "GET"], ["courses", "POST"], [`courses/${id}`, "GET"], [`courses/${id}`, "PATCH"], [`courses/${id}`, "DELETE"],
      ...["stages", "subjects", "chapters", "lessons", "questions"].flatMap((kind): [string, string][] => [[kind, "POST"], [`${kind}/${id}`, "PATCH"], [`${kind}/${id}`, "DELETE"]]),
      [`subjects/${id}`, "GET"], [`lessons/${id}`, "GET"], [`lessons/${id}/questions`, "GET"],
      ["chapters/reorder", "POST"], ["lessons/reorder", "POST"], ["questions/bulk", "POST"], ["account/password", "POST"],
    ];
    for (const [path, method] of routes) await request(`/api/admin/${path}`, method, undefined, 401, "");
    await request("/api/auth/login", "POST", { email, password }, 403, "", "https://evil.invalid");
    await request("/api/auth/login", "POST", { email, password: "incorrect" }, 401);
    const login = await request("/api/auth/login", "POST", { email, password });
    const setCookie = login.headers.get("set-cookie")!;
    assert.match(setCookie, /HttpOnly/i); assert.match(setCookie, /SameSite=lax/i);
    cookie = setCookie.split(";")[0];
    assert.equal((await (await request("/api/auth/session")).json()).user.email, email);
    assert.equal((await request("/api/admin/courses")).headers.get("cache-control"), "private, no-store");
    await prisma.user.update({ where: { id: userId }, data: { role: "STUDENT" } });
    for (const [path, method] of routes) await request(`/api/admin/${path}`, method, undefined, 403);
    await prisma.user.update({ where: { id: userId }, data: { role: "ADMIN" } });
    await request("/api/admin/courses", "POST", { title: "blocked" }, 403, cookie, "https://evil.invalid");
    await request("/api/admin/courses", "POST", { title: "", admin: true }, 400);
    await request("/api/admin/courses?page=0", "GET", undefined, 400);
    const course = (await (await request("/api/admin/courses", "POST", { title: "HTTP fixture" })).json()).course;
    courseId = course.id;
    const stage = (await (await request("/api/admin/stages", "POST", { courseId, title: "Stage" })).json()).stage;
    const subject = (await (await request("/api/admin/subjects", "POST", { stageId: stage.id, title: "Subject" })).json()).subject;
    const chapter = (await (await request("/api/admin/chapters", "POST", { subjectId: subject.id, title: "Chapter" })).json()).chapter;
    const lesson = (await (await request("/api/admin/lessons", "POST", { chapterId: chapter.id, title: "Lesson" })).json()).lesson;
    await request(`/api/admin/lessons/${lesson.id}`, "PATCH", { status: "PUBLISHED" });
    await request("/api/admin/questions/bulk", "POST", { lessonId: lesson.id, questions: Array.from({ length: 25 }, (_, n) => ({ type: "SHORT_ANSWER", content: `Q${n}`, correctAnswer: "2" })) });
    const first = await (await request(`/api/admin/lessons/${lesson.id}/questions?page=1`)).json();
    const second = await (await request(`/api/admin/lessons/${lesson.id}/questions?page=2`)).json();
    assert.equal(first.questions.length, 20); assert.equal(first.hasMore, true);
    assert.equal(second.questions.length, 5); assert.equal(second.hasMore, false);
    assert.equal(new Set([...first.questions, ...second.questions].map((q: { id: string }) => q.id)).size, 25);
    await request(`/api/admin/questions/${first.questions[0].id}`, "PATCH", { correctAnswer: "3" });
    await request(`/api/admin/questions/${first.questions[0].id}`, "DELETE");
    const outline = await (await request(`/api/admin/courses/${courseId}`)).json();
    assert.deepEqual(outline.course.stages[0].subjects[0].chapters, []);
    const branch = await (await request(`/api/admin/subjects/${subject.id}`)).json();
    assert.equal(branch.subject.chapters[0].lessons.length, 1);
    const detail = await (await request(`/api/admin/lessons/${lesson.id}`)).json();
    assert.equal("questions" in detail.lesson, false);
    for (const path of ["/dashboard", "/dashboard/courses", `/dashboard/courses/${courseId}`, `/dashboard/lessons/${lesson.id}/questions`, "/dashboard/settings"]) {
      const response = await request(path); assert.match(await response.text(), /TSA/);
    }
    await request(`/api/admin/courses/${courseId}`, "DELETE"); courseId = undefined;
    await request(`/api/admin/lessons/${lesson.id}`, "GET", undefined, 404);
    const parallelSession = await issueSession(userId);
    await request("/api/admin/account/password", "POST", { currentPassword: password, newPassword: `${password}new` });
    await request("/api/admin/courses", "GET", undefined, 401);
    await request("/api/admin/courses", "GET", undefined, 401, `${SESSION_COOKIE}=${parallelSession.token}`);
    await request("/api/auth/login", "POST", { email, password }, 401, "");
    const newLogin = await request("/api/auth/login", "POST", { email, password: `${password}new` }, 200, "");
    cookie = newLogin.headers.get("set-cookie")!.split(";")[0];
    await request("/api/auth/logout", "POST");
    await request("/api/admin/courses", "GET", undefined, 401);
  } finally {
    if (courseId) await prisma.course.deleteMany({ where: { id: courseId } });
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.loginThrottle.deleteMany({ where: { key: { in: [`login:${email}`, `login:password:${userId}`].map((v) => createHash("sha256").update(v).digest("hex")) } } });
    await prisma.$disconnect();
  }
});
