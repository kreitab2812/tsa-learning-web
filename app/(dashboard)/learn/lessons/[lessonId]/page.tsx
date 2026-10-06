import Link from "next/link";
import { notFound } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { idSchema } from "@/features/content/schemas";
import LearningLesson from "@/features/learning/components/learning-lesson";
import { requirePageUser } from "@/server/auth/session";
import { getLearningLesson } from "@/server/learning/service";
import { parsePreviewParams } from "@/server/learning/preview-params";
import { previewQuery } from "@/features/courses/navigation";
import PreviewBanner from "@/features/learning/components/preview-banner";


export default async function LearningLessonPage({ params, searchParams }: {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsed = idSchema.safeParse((await params).lessonId);
  if (!parsed.success) notFound();
  const query = await searchParams;
  const options = parsePreviewParams(query);
  const unlock = options.unlock ?? null;
  const user = await requirePageUser();
  const lesson = await getLearningLesson(user, parsed.data, options);
  if (lesson.locked) return <div className="mx-auto max-w-4xl space-y-6">{lesson.preview && <PreviewBanner courseId={lesson.courseId} subjectId={lesson.subjectId} chapterId={lesson.chapterId} studentName={lesson.previewStudentName} showDrafts={lesson.showDrafts} simulated={lesson.simulated} unlock={unlock} />}<div className="rounded-[2rem] border border-gray-200 bg-white p-8 text-center shadow-sm">
    <LockKeyhole size={38} className="mx-auto text-gray-400" /><h1 className="mt-4 text-xl font-black text-gray-900">Bài học đang bị khóa</h1><p className="mt-2 text-sm text-gray-500">{lesson.lockReason}</p>
    <Link href={`/learn/subjects/${lesson.subjectId}${lesson.preview ? previewQuery({ ...lesson, unlock }) : ""}#chapter-${lesson.chapterId}`} className="mt-6 inline-block rounded-xl bg-bkhn-red px-4 py-2.5 text-sm font-bold text-white">Quay lại môn học</Link>
  </div></div>;
  return <LearningLesson key={lesson.id + String(lesson.preview) + (lesson.preview ? lesson.simulated.join(",") : "")} initial={lesson} unlock={unlock} />;
}
