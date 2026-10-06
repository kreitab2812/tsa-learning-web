import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import LessonMediaView from "../../features/lessons/components/lesson-media-view";

const props = {
  title: "Lý thuyết",
  videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  documentUrl: "https://drive.google.com/file/d/test-document/view",
};

test("learner media can expand to tab size and keeps split controls and an exit", () => {
  const normal = renderToStaticMarkup(<LessonMediaView {...props} onFocusChange={() => {}} />);
  const focused = renderToStaticMarkup(<LessonMediaView {...props} focusMode onFocusChange={() => {}} />);
  assert.match(normal, /Tập trung học/);
  assert.ok(!normal.includes('role="dialog"'));
  assert.match(focused, /role="dialog" aria-modal="true"/);
  assert.match(focused, /Hiện giao diện/);
  assert.match(focused, /fixed inset-0/);
  assert.match(focused, /h-dvh/);
  assert.match(focused, /Chỉ Video/);
  assert.match(focused, /Chỉ PDF/);
  assert.match(focused, /role="separator"/);
  const sources = (html: string) => [...html.matchAll(/<iframe[^>]*src="([^"]+)"/g)].map(match => match[1]);
  assert.equal(sources(focused).length, 2);
  assert.deepEqual(sources(focused), sources(normal));
});

test("focus supports a single resource and is not added to the Admin editor", () => {
  for (const urls of [{ videoUrl: props.videoUrl }, { documentUrl: props.documentUrl }]) {
    const html = renderToStaticMarkup(<LessonMediaView title="Bài học" {...urls} focusMode onFocusChange={() => {}} />);
    assert.match(html, /Hiện giao diện/);
    assert.equal((html.match(/<iframe/g) ?? []).length, 1);
    assert.ok(!html.includes('role="separator"'));
  }
  const admin = renderToStaticMarkup(<LessonMediaView {...props} />);
  assert.ok(!admin.includes("Tập trung học"));
  assert.ok(!admin.includes("lesson-media-focus"));
});
