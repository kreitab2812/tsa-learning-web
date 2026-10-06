import "server-only";

import { prisma } from "@/server/db/prisma";

type AdminLesson = {
  id: string;
  title: string;
  order: number;
  status: "DRAFT" | "PUBLISHED" | "SCHEDULED";
  videoTheoryUrl: string | null;
  videoPracticeUrl: string | null;
  documentUrl: string | null;
  exerciseUrl: string | null;
  answerUrl: string | null;
};

type FlatAdminChapter = {
  id: string;
  title: string;
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
              chapters: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  title: true,
                  order: true,
                  parentId: true,
                  lessons: {
                    orderBy: { order: "asc" },
                    select: {
                      id: true,
                      title: true,
                      order: true,
                      status: true,
                      videoTheoryUrl: true,
                      videoPracticeUrl: true,
                      documentUrl: true,
                      exerciseUrl: true,
                      answerUrl: true,
                    },
                  },
                },
              },
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
        chapters: buildChapterTree(subject.chapters),
      })),
    })),
  };
}
