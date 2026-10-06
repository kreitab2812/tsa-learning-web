import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import Pagination from "../../features/admin/components/pagination";
import AdminOverview from "../../features/admin/components/overview";

test("pagination presents ranges, boundaries and loading without invented totals", () => {
  const render = (page: number, hasMore: boolean, busy = false, itemCount = 20) => renderToStaticMarkup(<Pagination page={page} hasMore={hasMore} busy={busy} itemCount={itemCount} itemLabel="câu hỏi" onChange={() => {}} />);
  const first = render(1, true);
  assert.match(first, /1–20 câu hỏi/);
  assert.match(first, /aria-label="Trang trước" disabled=""/);
  assert.ok(!first.includes("btn-outline"));
  assert.match(render(2, false, false, 7), /21–27 câu hỏi/);
  assert.match(render(2, false), /aria-label="Trang sau" disabled=""/);
  assert.match(render(2, true, true), /Đang tải trang 2/);
  assert.equal((render(2, true, true).match(/disabled=""/g) ?? []).length, 2);
  assert.ok(!render(1, false, false, 0).includes("1–0"));
});

test("overview uses supplied counts and no obsolete future-phase promises", () => {
  const html = renderToStaticMarkup(<AdminOverview summary={{ courses: 2, subjects: 3, lessons: 27, questions: 123 }} />);
  assert.match(html, /Tổng quan nội dung/);
  assert.match(html, />123</);
  assert.ok(!html.includes("sẽ được triển khai"));
  assert.ok(html.includes("/dashboard/health"));
  const empty = renderToStaticMarkup(<AdminOverview summary={{ courses: 0, subjects: 0, lessons: 0, questions: 0 }} />);
  assert.match(empty, /Bắt đầu với khóa học đầu tiên/);
});
