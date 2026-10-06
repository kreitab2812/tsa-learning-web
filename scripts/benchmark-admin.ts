import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../server/db/prisma";
import { getAdminCourse as legacyCourse } from "../tests/fixtures/legacy-course-query";
import { getAdminCourse, getAdminSubjectTree } from "../server/admin/course-queries";
import { getAdminLesson, listAdminQuestions } from "../server/admin/lesson-queries";
import { issueSession, SESSION_COOKIE } from "../server/auth/session-store";
import { hashPassword } from "../server/auth/password";

async function main() {
  assert.equal(process.env.ALLOW_INTEGRATION_TESTS, "1", "Benchmark writes isolated fixtures; only run on a test database.");
  assert.equal(process.env.DB_QUERY_METRICS, "1");
  const base = process.env.TEST_BASE_URL || "http://localhost:3000";
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
  const courseId = randomUUID(), userId = randomUUID();
  let queries = 0;
  prisma.$on("query", () => { queries++; });
  const stages = Array.from({ length: 3 }, (_, order) => ({ id: randomUUID(), courseId, title: `Stage ${order}`, order }));
  const subjects = stages.flatMap((stage) => Array.from({ length: 3 }, (_, order) => ({ id: randomUUID(), stageId: stage.id, title: `Subject ${order}`, order })));
  const chapters = subjects.flatMap((subject) => Array.from({ length: 10 }, (_, order) => ({ id: randomUUID(), subjectId: subject.id, title: `Chapter ${order}`, order })));
  const lessons = chapters.flatMap((chapter) => Array.from({ length: 8 }, (_, order) => ({ id: randomUUID(), chapterId: chapter.id, title: `Lesson ${order}`, order,
    videoTheoryUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", documentUrl: "https://example.invalid/document.pdf" })));
  const results: object[] = [];
  async function measure(label: string, action: () => Promise<unknown>, sql = true) {
    await action(); // Warm connection and, for HTTP, compile the dev route.
    const samples = [];
    for (let i = 0; i < 5; i++) {
      queries = 0; const start = performance.now(); const data = await action();
      samples.push({ ms: Math.round(performance.now() - start), queries: sql ? queries : null, bytes: Buffer.byteLength(JSON.stringify(data)) });
    }
    samples.sort((a, b) => a.ms - b.ms);
    results.push({ label, p50ms: samples[2].ms, p95ms: samples[4].ms, queries: samples[2].queries, payloadBytes: samples[2].bytes });
  }
  try {
    await prisma.course.create({ data: { id: courseId, title: "Benchmark fixture (temporary)" } });
    await prisma.stage.createMany({ data: stages });
    await prisma.subject.createMany({ data: subjects });
    await prisma.chapter.createMany({ data: chapters });
    await prisma.lesson.createMany({ data: lessons });
    await prisma.question.createMany({ data: Array.from({ length: 100 }, (_, order) => ({ lessonId: lessons[0].id, type: "SHORT_ANSWER", order,
      content: `Question ${order}: ${"Nội dung câu hỏi và công thức $x^2$. ".repeat(12)}`, correctAnswer: "2", explanation: "Giải thích. ".repeat(20) })) });
    await prisma.user.create({ data: { id: userId, email: `benchmark-${userId}@example.invalid`, role: "ADMIN", passwordHash: await hashPassword(randomUUID()) } });
    const session = await issueSession(userId);
    const api = async (path: string) => {
      const res = await fetch(`${base}${path}`, { headers: { Cookie: `${SESSION_COOKIE}=${session.token}` } });
      assert.equal(res.status, 200); return res.json();
    };
    await measure("legacy full course", () => legacyCourse(courseId));
    await measure("course outline", () => getAdminCourse(courseId));
    await measure("one subject branch", () => getAdminSubjectTree(subjects[0].id));
    await measure("legacy lesson with all questions", () => prisma.lesson.findUniqueOrThrow({ where: { id: lessons[0].id }, include: { chapter: true, questions: { orderBy: { order: "asc" } } } }));
    await measure("lesson metadata", () => getAdminLesson(lessons[0].id));
    await measure("questions page (20)", () => listAdminQuestions(lessons[0].id));
    await measure("HTTP authenticated outline (dev)", () => api(`/api/admin/courses/${courseId}`), false);
    await measure("HTTP authenticated subject (dev)", () => api(`/api/admin/subjects/${subjects[0].id}`), false);
    await measure("HTTP authenticated questions (dev)", () => api(`/api/admin/lessons/${lessons[0].id}/questions`), false);
    const plan = await prisma.$queryRawUnsafe(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT "id", "title", "order" FROM "Lesson" WHERE "chapterId" = $1 ORDER BY "order", "id" LIMIT 21`, chapters[0].id);
    console.log(JSON.stringify({ measuredAt: new Date().toISOString(), fixture: { stages: 3, subjects: 9, chapters: 90, lessons: 720, questions: 100 }, samplesPerCase: 5, results, lessonQueryPlan: plan }, null, 2));
  } finally {
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
