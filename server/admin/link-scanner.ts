import "server-only";
import { prisma } from "@/server/db/prisma";
import { lessonResources } from "@/features/analytics/link-fields";
import { checkPublicLink, type ScanResult } from "./link-check";
import { descendantIds } from "@/features/analytics/filters";
import { linkScanSchema } from "@/features/learning/schemas";
import { HttpError } from "@/server/http/errors";
import type { z } from "zod";

export async function scanLessonLinks(input: number | z.input<typeof linkScanSchema>) {
  const options = linkScanSchema.parse(typeof input === "number" ? { limit: input } : input);
  let chapterIds: string[] | undefined;
  if (options.chapterId) {
    const chapters = await prisma.chapter.findMany({ where: options.subjectId ? { subjectId: options.subjectId } : {}, select: { id: true, parentId: true } });
    chapterIds = [...descendantIds(chapters, options.chapterId)];
    if (!chapterIds.length) throw new HttpError(404, "Cụm không thuộc môn đang xem.");
  }
  // Reuse the existing atomic expiry table with a separate namespace. This
  // global cooldown also bounds overlapping requests from multiple admin tabs.
  const lease = await prisma.$queryRaw<{ key: string }[]>`
    INSERT INTO "LoginThrottle" ("key", "attempts", "expiresAt")
    VALUES ('health:link-scan', 1, CURRENT_TIMESTAMP + INTERVAL '60 seconds')
    ON CONFLICT ("key") DO UPDATE SET "expiresAt" = EXCLUDED."expiresAt", "attempts" = 1
    WHERE "LoginThrottle"."expiresAt" <= CURRENT_TIMESTAMP RETURNING "key"`;
  if (!lease.length) throw new HttpError(429, "Vui lòng đợi tối đa 60 giây giữa hai lượt quét.", 60);
  const lessons = await prisma.lesson.findMany({ where: {
    ...(options.lessonId ? { id: options.lessonId } : {}),
    ...(chapterIds ? { chapterId: { in: chapterIds } } : {}),
    ...(options.subjectId ? { chapter: { subjectId: options.subjectId } } : {}),
  }, orderBy: { id: "asc" }, select: {
    id: true, videoTheoryUrl: true, videoPracticeUrl: true, documentUrl: true, exerciseUrl: true, answerUrl: true, theoryDocumentUrl: true, practiceDocumentUrl: true,
    attachments: { select: { id: true, title: true, url: true, sourceKey: true, kind: true } },
    linkHealth: { select: { kind: true, url: true, checkedAt: true } },
  } });
  const links = lessons.flatMap((lesson) => lessonResources(lesson).flatMap((definition) => {
    if (options.kind && definition.kind !== options.kind) return [];
    const { url } = definition;
    if (!url) return [];
    const previous = lesson.linkHealth.find((item) => item.kind === definition.kind && item.url === url);
    return [{ lessonId: lesson.id, kind: definition.kind, url, checkedAt: previous?.checkedAt ?? null }];
  })).sort((a, b) => (a.checkedAt?.getTime() ?? 0) - (b.checkedAt?.getTime() ?? 0)).slice(0, options.limit);
  const checked: Array<(typeof links)[number] & ScanResult> = [];
  for (let offset = 0; offset < links.length; offset += 4) {
    checked.push(...await Promise.all(links.slice(offset, offset + 4).map(async (link) => ({ ...link, ...await checkPublicLink(link.url) }))));
  }
  const checkedAt = new Date();
  if (checked.length) await prisma.$transaction(checked.map((item) => prisma.lessonLinkHealth.upsert({
    where: { lessonId_kind: { lessonId: item.lessonId, kind: item.kind } },
    create: { lessonId: item.lessonId, kind: item.kind, url: item.url, status: item.status, statusCode: item.statusCode, error: item.error, checkedAt },
    update: { url: item.url, status: item.status, statusCode: item.statusCode, error: item.error, checkedAt },
  })));
  return { scanned: checked.length, healthy: checked.filter((item) => item.status === "HEALTHY").length,
    broken: checked.filter((item) => item.status === "BROKEN").length, blocked: checked.filter((item) => item.status === "BLOCKED").length };
}
