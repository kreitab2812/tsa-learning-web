import "server-only";

import { prisma } from "@/server/db/prisma";

type AdminLesson = {
  id: string;
  title: string;
  order: number;
  status: "DRAFT" | "PUBLISHED";
  videoTheoryUrl: string | null;
  videoPracticeUrl: string | null;
  documentUrl: string | null;
  exerciseUrl: string | null;
  answerUrl: string | null;
};

type FlatAdminChapter = {
  id: string;
  title: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED";
  openAt: Date | null;
  closeAt: Date | null;
  order: number;
  parentId: string | null;
  lessons: AdminLesson[];
};

type AdminChapter = FlatAdminChapter & { children: AdminChapter[] };

/**
 * PostgreSQL returns the chapters as a compact, indexed flat list. Building
 * the hierarchy in memory removes the former hard limit of three chapter
 * levels while keeping the API contract used by the admin UI intact.
 */
function buildChapterTree(chapters: FlatAdminChapter[]): AdminChapter[] {
  const chaptersByParent = new Map<string | null, FlatAdminChapter[]>();

  for (const chapter of chapters) {
    const siblings = chaptersByParent.get(chapter.parentId) ?? [];
    siblings.push(chapter);
    chaptersByParent.set(chapter.parentId, siblings);
  }

  const buildBranch = (parentId: string | null): AdminChapter[] =>
    (chaptersByParent.get(parentId) ?? []).map((chapter) => ({
      ...chapter,
      children: buildBranch(chapter.id),
    }));

  return buildBranch(null);
}

export async function listAdminCourses(page = 1) {
  const rows = await prisma.course.findMany({
    skip: (page - 1) * 20, take: 21,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      title: true,
      description: true,
      thumbnailUrl: true,
      badge: true,
      status: true,
      publishAt: true,
      showCountdown: true,
      _count: { select: { stages: true } },
    },
  });
  return { courses: rows.slice(0, 20), page, hasMore: rows.length > 20 };
}

export async function getAdminCourse(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      description: true,
      stages: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          color: true,
          order: true,
          timeframe: true,
          accessMode: true,
          unlockAt: true,
          subjects: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              description: true,
              teacherName: true,
              order: true,
              _count: { select: { chapters: { where: { parentId: null } } } },
            },
          },
        },
      },
    },
  });

  if (!course) return null;

  return {
    ...course,
    stages: course.stages.map((stage) => ({
      ...stage,
      subjects: stage.subjects.map((subject) => ({
        ...subject,
        chapters: [] as AdminChapter[],
      })),
    })),
  };
}

export async function getAdminSubjectTree(id: string) {
  const subject = await prisma.subject.findUniqueOrThrow({
    where: { id },
    include: { chapters: { orderBy: [{ order: "asc" }, { id: "asc" }],
      select: { id: true, title: true, description: true, status: true, openAt: true, closeAt: true, order: true, parentId: true,
        lessons: { orderBy: [{ order: "asc" }, { id: "asc" }],
          select: { id: true, title: true, order: true, status: true, videoTheoryUrl: true, videoPracticeUrl: true, documentUrl: true, exerciseUrl: true, answerUrl: true } } } } },
  });
  return { ...subject, chapters: buildChapterTree(subject.chapters) };
}
