import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { IMPORT_COLUMNS, IMPORT_SAMPLE, parseQuizCsv, reviewQuestions, reviewTable } from "../../features/lessons/quiz-import";
import { previewQuizImport } from "../../server/admin/quiz-import";
import { bulkQuestionsSchema } from "../../features/content/schemas";

test("all three types and formatted answers/explanations survive review", () => {
  const values = structuredClone(IMPORT_SAMPLE);
  values[0].options![0].text = "**Đồ thị** ![Ảnh](https://example.com/graph.png)";
  values[0].explanation = "| x | y |\n| --- | --- |\n| 1 | $x^2$ |\n![Giải](https://example.com/solution.png)";
  const review = reviewQuestions(values);
  assert.deepEqual(review.errors, []);
  assert.ok(review.rows.every(row => !row.errors.length));
  assert.equal(review.rows[0].question?.explanation, values[0].explanation);
});

test("review blocks invalid rows but only warns about duplicates without dropping them", () => {
  const review = reviewQuestions([IMPORT_SAMPLE[0], { content: "Missing choices" }, IMPORT_SAMPLE[0], { type: "SHORT_ANSWER", content: "No answer" }], 2);
  assert.equal(review.rows.length, 4);
  assert.deepEqual(review.rows.filter(row => row.errors.length).map(row => row.row), [3, 5]);
  assert.deepEqual(review.rows[2].errors, []);
  assert.match(review.rows[2].warnings[0], /dòng 2/);
  assert.ok(review.rows[2].question);
  assert.ok(reviewQuestions(Array(101).fill(IMPORT_SAMPLE[0])).errors.length);
});

test("JSON duplicates of all three types remain valid for saving in their original order", async () => {
  const values = [...IMPORT_SAMPLE, ...IMPORT_SAMPLE, IMPORT_SAMPLE[0]];
  const review = await previewQuizImport("questions.json", JSON.stringify(values));
  assert.deepEqual(review.errors, []);
  assert.equal(review.rows.length, 7);
  assert.ok(review.rows.every(row => !row.errors.length && row.question));
  assert.deepEqual(review.rows.slice(0, 3).map(row => row.warnings), [[], [], []]);
  for (const [index, original] of [[3, 1], [4, 2], [5, 3], [6, 1]]) {
    assert.match(review.rows[index].warnings[0], new RegExp(`dòng ${original}`));
  }
  const payload = bulkQuestionsSchema.parse({ lessonId: "00000000-0000-4000-8000-000000000001", questions: review.rows.map(row => row.question) });
  assert.equal(payload.questions.length, 7);
  assert.deepEqual(payload.questions[0], payload.questions[3]);
});

test("CSV and Excel table duplicates warn with source row numbers, while actual errors still block", async () => {
  const header = ["type", "content", "correctAnswer"];
  const row = ["SHORT_ANSWER", "1+1", "2"];
  const csv = [header, row, row].map(cells => cells.join(",")).join("\n");
  for (const review of [await previewQuizImport("questions.csv", csv), reviewTable([header, row, row])]) {
    assert.ok(review.rows.every(item => !item.errors.length && item.question));
    assert.match(review.rows[1].warnings[0], /dòng 2/);
  }
  const mixed = reviewTable([header, row, [...row, "extra cell"]]);
  assert.ok(mixed.rows[1].errors.length);
  assert.ok(mixed.rows[1].warnings.length);
});

test("CSV handles quoted commas, newlines, escaped quotes, BOM and semicolon", () => {
  assert.deepEqual(parseQuizCsv('\uFEFFa,b\r\n"one,two","a\n""b"""\r\n'), [["a", "b"], ["one,two", 'a\n"b"']]);
  assert.deepEqual(parseQuizCsv("a;b\n1;2"), [["a", "b"], ["1", "2"]]);
  assert.throws(() => parseQuizCsv('a,b\n"broken'), /ngoặc/);
  assert.throws(() => parseQuizCsv('a,b\n"ok"bad,x'), /ngoặc/);
});

test("table rejects unknown headers, blank interior rows and conflicting answer fields", () => {
  assert.ok(reviewTable([["type", "content", "mystery"]]).errors.length);
  const rows = reviewTable([IMPORT_COLUMNS, ["SHORT_ANSWER", "1+1", "unused", "", "", "", "2"], [], ["TRUE_FALSE_GROUP", "Q", "a", "b", "c", "d", "A", "true,false,true,maybe"]]);
  assert.equal(rows.rows.length, 3);
  assert.ok(rows.rows.every(row => row.errors.length > 0));
});

test("distributed CSV and Excel templates each import exactly three valid types", async () => {
  for (const extension of ["csv", "xlsx"]) {
    const buffer = await readFile(`public/templates/quiz-questions.${extension}`);
    const review = await previewQuizImport(`template.${extension}`, buffer.toString(extension === "xlsx" ? "base64" : "utf8"));
    assert.deepEqual(review.errors, []);
    assert.equal(review.rows.length, 3);
    assert.ok(review.rows.every(row => !row.errors.length), JSON.stringify(review));
    assert.deepEqual(review.rows.map(row => row.question?.type), ["MULTIPLE_CHOICE", "TRUE_FALSE_GROUP", "SHORT_ANSWER"]);
  }
});

test("unsupported, damaged and oversized files are rejected", async () => {
  await assert.rejects(previewQuizImport("bad.xls", "data"), /Chỉ nhận/);
  await assert.rejects(previewQuizImport("bad.xlsx", Buffer.from("bad file").toString("base64")));
  await assert.rejects(previewQuizImport("large.json", " ".repeat(1024 * 1024 + 1)), /1 MB/);
  await assert.rejects(previewQuizImport("bad.json", "```json\n[]\n```"), /JSON/);
});
