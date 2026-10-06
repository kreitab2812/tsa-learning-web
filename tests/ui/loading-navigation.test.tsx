import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import LoadingState, { LoadingIndicator } from "../../components/ui/loading-state";
import SubjectViewNav from "../../features/courses/components/subject-view-nav";

test("loading views announce real waiting state and respect reduced motion", () => {
  const html = renderToStaticMarkup(<LoadingState label="Đang tải bài học…" />);
  assert.match(html, /role="status"/);
  assert.match(html, /Đang tải bài học…/);
  assert.match(html, /motion-safe:animate-pulse/);
  assert.match(renderToStaticMarkup(<LoadingIndicator />), /motion-reduce:animate-none/);
});

test("course editor hides Health entry without removing its standalone navigation", () => {
  const props = { courseId: "course", subjectId: "subject", active: "edit" as const };
  const course = renderToStaticMarkup(<SubjectViewNav {...props} showAnalytics={false} />);
  assert.ok(!course.includes("/dashboard/health"));
  assert.ok(!course.includes("Xem như học viên"));
  const health = renderToStaticMarkup(<SubjectViewNav {...props} active="analytics" />);
  assert.ok(health.includes("/dashboard/health?subject=subject"));
});
