import "server-only";
import { inflateRawSync } from "node:zlib";
import readXlsxFile from "read-excel-file/node";
import { IMPORT_BYTES, parseQuizCsv, reviewQuestions, reviewTable, type ImportPreview } from "@/features/lessons/quiz-import";

// Validate the ZIP envelope before the Excel library allocates sheet arrays. Never extract to disk.
function inspectWorkbook(buffer: Buffer) {
  let end = buffer.length - 22;
  while (end >= Math.max(0, buffer.length - 65557) && buffer.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0 || end < buffer.length - 65557) throw new Error("Tệp Excel không hợp lệ.");
  const entries = buffer.readUInt16LE(end + 10);
  let cursor = buffer.readUInt32LE(end + 16), total = 0;
  if (entries > 100 || entries < 1) throw new Error("Excel quá phức tạp; hãy dùng mẫu một sheet Questions.");
  const formulas = new Map<number, string[]>();
  for (let index = 0; index < entries; index++) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error("Cấu trúc Excel không hợp lệ.");
    const method = buffer.readUInt16LE(cursor + 10), compressed = buffer.readUInt32LE(cursor + 20), size = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28), extra = buffer.readUInt16LE(cursor + 30), comment = buffer.readUInt16LE(cursor + 32);
    const name = buffer.toString("utf8", cursor + 46, cursor + 46 + nameLength);
    const local = buffer.readUInt32LE(cursor + 42);
    total += size;
    if (size > 2 * IMPORT_BYTES || total > 8 * IMPORT_BYTES || ![0, 8].includes(method) || (buffer.readUInt16LE(cursor + 8) & 1)) throw new Error("Excel quá lớn sau giải nén hoặc được mã hóa.");
    if (local + 30 > buffer.length || buffer.readUInt32LE(local) !== 0x04034b50) throw new Error("Tệp Excel bị hỏng.");
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    if (start + compressed > buffer.length) throw new Error("Tệp Excel bị cắt ngắn.");
    const source = buffer.subarray(start, start + compressed);
    const decoded = method === 8 ? inflateRawSync(source, { maxOutputLength: Math.max(1, size) }) : source;
    if (decoded.length !== size) throw new Error("Kích thước bên trong Excel không hợp lệ.");
    if (/^xl\/worksheets\/[^/]+\.xml$/.test(name)) {
      const xml = decoded.toString("utf8");
      for (const match of xml.matchAll(/<(?:\w+:)?(?:c|row)\b[^>]*\br=["']([A-Z]*)(\d+)["']/g)) {
        if (Number(match[2]) > 101 || (match[1] && (match[1].length > 1 || match[1] > "J"))) throw new Error("Excel vượt 100 câu hoặc 10 cột của mẫu.");
      }
      for (const match of xml.matchAll(/<(?:\w+:)?c\b[^>]*\br=["']([A-Z]+)(\d+)["'][^>]*>([\s\S]*?)<\/(?:\w+:)?c>/g)) {
        if (/<(?:\w+:)?f(?:\s|\/|>)/.test(match[3])) {
          const row = Number(match[2]);
          formulas.set(row, [...(formulas.get(row) ?? []), `Ô ${match[1]}${row} chứa công thức Excel. Hãy dán giá trị văn bản; công thức Toán dùng $LaTeX$.`]);
        }
      }
    }
    cursor += 46 + nameLength + extra + comment;
  }
  return formulas;
}

export async function previewQuizImport(filename: string, content: string): Promise<ImportPreview> {
  if (/\.xlsx$/i.test(filename)) {
    if (!/^[\da-z+/]*={0,2}$/i.test(content)) throw new Error("Dữ liệu Excel không hợp lệ.");
    const buffer = Buffer.from(content, "base64");
    if (!buffer.length || buffer.length > IMPORT_BYTES) throw new Error("Tệp nhập tối đa 1 MB.");
    const formulas = inspectWorkbook(buffer);
    const sheets = await readXlsxFile(buffer, { parseNumber: value => value });
    if (sheets.length !== 1 || sheets[0].sheet !== "Questions") return { rows: [], errors: ["Cần đúng một sheet tên Questions. Dùng mẫu Excel tải xuống."] };
    const review = reviewTable(sheets[0].data);
    if (formulas.has(1)) review.errors.push(...formulas.get(1)!);
    return { ...review, rows: review.rows.map(row => ({ ...row, errors: [...row.errors, ...(formulas.get(row.row) ?? [])] })) };
  }
  if (Buffer.byteLength(content) > IMPORT_BYTES) throw new Error("Tệp nhập tối đa 1 MB.");
  if (/\.csv$/i.test(filename)) return reviewTable(parseQuizCsv(content));
  if (/\.json$/i.test(filename)) {
    try { return reviewQuestions(JSON.parse(content.replace(/^\uFEFF/, ""))); }
    catch { throw new Error("JSON không hợp lệ. Dán mảng JSON thuần, không kèm khung ``` hoặc lời bình của AI."); }
  }
  throw new Error("Chỉ nhận .xlsx, .csv hoặc .json.");
}
