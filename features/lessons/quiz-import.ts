import { z } from "zod";
import { questionSchema } from "@/features/content/schemas";

export type ImportedQuestion = z.output<typeof questionSchema>;
export type ImportRow = { row: number; content: string; question?: ImportedQuestion; errors: string[]; warnings: string[] };
export type ImportPreview = { rows: ImportRow[]; errors: string[] };
export const IMPORT_COLUMNS = ["type", "content", "A", "B", "C", "D", "correctAnswer", "trueFalse", "imageUrl", "explanation"];
export const IMPORT_LIMIT = 100;
export const IMPORT_BYTES = 1024 * 1024;
export const IMPORT_SAMPLE = [
  { type: "MULTIPLE_CHOICE", content: "Tính $2^3$.", options: ["6", "8", "9", "12"].map((text, i) => ({ id: "ABCD"[i], text })), correctAnswer: "B", explanation: "$2^3 = 2 \\times 2 \\times 2 = 8$." },
  { type: "TRUE_FALSE_GROUP", content: "Các mệnh đề về số 2:", options: [{ id: "A", text: "Là số chẵn", isTrue: true }, { id: "B", text: "Là số lẻ", isTrue: false }, { id: "C", text: "Lớn hơn 1", isTrue: true }, { id: "D", text: "Nhỏ hơn 0", isTrue: false }] },
  { type: "SHORT_ANSWER", content: "Tính $3 + 4$.", correctAnswer: "7", explanation: "Kết quả là **7**." },
];
export const AI_IMPORT_PROMPT = `Chuyển đề dưới đây thành mảng JSON thuần (không bọc code fence), tối đa 100 câu. Không đoán đáp án hoặc tự bỏ câu: chỗ thiếu hãy để trống để người dùng kiểm tra. Giữ nguyên nội dung và lời giải. Không thêm trường ngoài mẫu. Ba loại: MULTIPLE_CHOICE (đúng 4 lựa chọn A/B/C/D, correctAnswer là ID); TRUE_FALSE_GROUP (mỗi lựa chọn có isTrue boolean, không có correctAnswer); SHORT_ANSWER (correctAnswer dạng chuỗi, không có options). Định dạng Markdown, công thức LaTeX trong $...$, bảng Markdown, ảnh ![mô tả](https://...), không dùng HTML. Escape dấu gạch chéo LaTeX theo JSON. imageUrl và explanation là tùy chọn. Đây là ví dụ cả ba loại:\n${JSON.stringify(IMPORT_SAMPLE, null, 2)}\n\nĐỀ CẦN CHUYỂN:\n`;

export function reviewQuestions(values: unknown, offset = 1): ImportPreview {
  if (!Array.isArray(values) || !values.length || values.length > IMPORT_LIMIT) return { rows: [], errors: ["Cần từ 1 đến 100 câu hỏi mỗi lần nhập."] };
  const seen = new Map<string, number>();
  const rows = values.map((value, i): ImportRow => {
    const result = questionSchema.safeParse(value);
    const content = typeof value?.content === "string" ? value.content : "(Thiếu nội dung)";
    if (!value?.type) return { row: i + offset, content, errors: ["type: phải chỉ rõ loại câu hỏi; không tự suy đoán loại."], warnings: [] };
    if (!result.success) return { row: i + offset, content, errors: result.error.issues.map(issue => `${issue.path.join(".") || "Câu hỏi"}: ${issue.message}`), warnings: [] };
    const key = JSON.stringify(result.data);
    const duplicate = seen.get(key);
    if (duplicate === undefined) seen.set(key, i + offset);
    return { row: i + offset, content, question: result.data, errors: [], warnings: duplicate === undefined ? [] : [`Trùng hoàn toàn với dòng ${duplicate} trong lần nhập này. Câu hỏi vẫn được nhập nếu bạn duyệt.`] };
  });
  return { rows, errors: [] };
}

/** RFC-style quoted fields, escaped quotes, embedded newlines and comma/semicolon separators. */
export function parseQuizCsv(source: string): string[][] {
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const header = text.split("\n", 1)[0];
  const delimiter = header.includes(";") && !header.includes(",") ? ";" : ",";
  const rows: string[][] = []; let row: string[] = [], field = "", quoted = false, closed = false;
  function cell() { row.push(field); field = ""; closed = false; }
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else field += char;
    } else if (char === delimiter) cell();
    else if (char === "\n") { cell(); rows.push(row); row = []; }
    else if (char === '"' && !field && !closed) quoted = true;
    else {
      if (closed || char === '"') throw new Error(`CSV sai dấu ngoặc kép gần dòng ${rows.length + 1}.`);
      field += char;
    }
    if (rows.length > IMPORT_LIMIT + 1 || row.length > IMPORT_COLUMNS.length) throw new Error("CSV vượt 100 câu hoặc thừa cột.");
  }
  if (quoted) throw new Error("CSV thiếu dấu ngoặc kép đóng.");
  if (field || row.length || closed) { cell(); rows.push(row); }
  return rows;
}

export function reviewTable(table: unknown[][]): ImportPreview {
  const headers = table[0]?.map(value => String(value ?? "").trim());
  if (!headers?.length || !headers.includes("type") || !headers.includes("content")) return { rows: [], errors: ["Thiếu hàng tiêu đề type, content. Hãy dùng mẫu tải xuống."] };
  if (new Set(headers).size !== headers.length || headers.some(h => !IMPORT_COLUMNS.includes(h))) return { rows: [], errors: ["Tiêu đề trùng hoặc không đúng mẫu. Không tự bỏ các cột không nhận diện được."] };
  const rowErrors = new Map<number, string[]>();
  const values = table.slice(1).map((cells, i) => {
    const errors: string[] = [];
    if (cells.length > headers.length) errors.push("Thừa ô so với hàng tiêu đề.");
    if (cells.some(cell => cell !== null && cell !== undefined && !["string", "number", "boolean"].includes(typeof cell))) errors.push("Chỉ nhận nội dung văn bản/số; không dùng ô kiểu ngày tháng.");
    const record = Object.fromEntries(headers.map((key, index) => [key, String(cells[index] ?? "").trim()]));
    const type = record.type;
    const flags = (record.trueFalse ?? "").split(",").map(x => x.trim().toLowerCase());
    if (type === "TRUE_FALSE_GROUP" && (flags.length !== 4 || flags.some(x => !["true", "false"].includes(x)))) errors.push("trueFalse: cần đúng 4 giá trị true/false, ngăn bởi dấu phẩy.");
    if (type !== "TRUE_FALSE_GROUP" && record.trueFalse) errors.push("trueFalse chỉ dùng cho câu Đúng/Sai.");
    if (type === "TRUE_FALSE_GROUP" && record.correctAnswer) errors.push("Câu Đúng/Sai dùng trueFalse; để trống correctAnswer.");
    if (type === "SHORT_ANSWER" && "ABCD".split("").some(id => record[id])) errors.push("Câu ngắn phải để trống A/B/C/D.");
    rowErrors.set(i + 2, errors);
    return { type, content: record.content, imageUrl: record.imageUrl || null, explanation: record.explanation || null,
      correctAnswer: type === "TRUE_FALSE_GROUP" ? null : record.correctAnswer || null,
      options: type === "SHORT_ANSWER" ? null : "ABCD".split("").map((id, index) => ({ id, text: record[id] ?? "", ...(type === "TRUE_FALSE_GROUP" ? { isTrue: flags[index] === "true" } : {}) })),
    };
  });
  const preview = reviewQuestions(values, 2);
  return { ...preview, rows: preview.rows.map(row => ({ ...row, errors: [...(rowErrors.get(row.row) ?? []), ...row.errors] })) };
}
