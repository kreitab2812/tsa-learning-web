"use client";
import { useEffect, useRef, useState } from "react";
import { adminJson, errorMessage } from "@/features/admin/api";
import { AI_IMPORT_PROMPT, IMPORT_BYTES, IMPORT_SAMPLE, type ImportPreview } from "../quiz-import";
import QuestionCard from "./question-card";

export default function QuizImportPanel({ lessonId, onDone, onBusyChange }: {
  lessonId: string; onDone: () => Promise<void>; onBusyChange: (busy: boolean) => void;
}) {
  const [source, setSource] = useState({ filename: "questions.json", content: "" });
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [approved, setApproved] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const busy = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => { onBusyChange(pending); return () => onBusyChange(false); }, [pending, onBusyChange]);
  function change(next: typeof source) { setSource(next); setPreview(null); setApproved(false); setError(null); setMessage(null); }
  async function choose(file?: File) {
    if (!file || busy.current) return;
    if (file.size > IMPORT_BYTES || !/\.(csv|xlsx|json)$/i.test(file.name)) { setError("Chọn .xlsx, .csv hoặc .json, tối đa 1 MB."); setPreview(null); setApproved(false); return; }
    busy.current = true; setPending(true); setPreview(null); setApproved(false);
    try {
      let content: string;
      if (/\.xlsx$/i.test(file.name)) content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onerror = () => reject(new Error("Không đọc được tệp."));
        reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.readAsDataURL(file);
      });
      else content = await file.text();
      change({ filename: file.name, content });
    } catch (cause) { setError(errorMessage(cause)); }
    finally { busy.current = false; setPending(false); }
  }
  async function inspect() {
    if (busy.current) return;
    busy.current = true; setPending(true); setError(null); setApproved(false); setPreview(null);
    try {
      const result = await adminJson<{ preview: ImportPreview }>("/api/admin/questions/bulk/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(source) });
      setPreview(result.preview);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { busy.current = false; setPending(false); }
  }
  const invalid = !preview || preview.errors.length > 0 || !preview.rows.length || preview.rows.some(row => row.errors.length > 0 || !row.question);
  const warningCount = preview?.rows.filter(row => row.warnings.length > 0).length ?? 0;
  async function commit() {
    if (busy.current || invalid || !approved || !preview) return;
    busy.current = true; setPending(true); setError(null);
    try {
      const result = await adminJson<{ count: number }>("/api/admin/questions/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId, reviewed: true, questions: preview.rows.map(row => row.question) }) });
      change({ filename: "questions.json", content: "" });
      if (fileInput.current) fileInput.current.value = "";
      setMessage(`Đã thêm ${result.count} câu vào cuối bài học.`);
      await onDone();
    } catch (cause) { setError(`${errorMessage(cause)} Nếu mất kết nối sau khi lưu, hãy kiểm tra danh sách câu hỏi trước khi thử lại để tránh nhập trùng.`); setApproved(false); }
    finally { busy.current = false; setPending(false); }
  }
  return <section className="space-y-4 rounded-2xl border border-bkhn-pink bg-white p-4 sm:p-5">
    <div><h3 className="font-black text-gray-900">Nhập câu hỏi có kiểm duyệt</h3><p className="mt-1 text-xs leading-relaxed text-gray-500">1. Chọn tệp hoặc dán JSON → 2. Kiểm tra từng dòng → 3. Duyệt và lưu. Tối đa 100 câu / 1 MB. Không nhập một phần khi còn lỗi.</p></div>
    <div className="flex flex-wrap gap-2 text-xs font-bold text-bkhn-red"><a href="/templates/quiz-questions.xlsx" download className="rounded-lg bg-bkhn-pale px-3 py-2">Tải mẫu Excel</a><a href="/templates/quiz-questions.csv" download className="rounded-lg bg-bkhn-pale px-3 py-2">Tải mẫu CSV</a></div>
    <details className="rounded-xl bg-gray-50 p-3 text-xs"><summary className="cursor-pointer font-bold text-gray-700">Hướng dẫn Excel/CSV & AI bên ngoài</summary><div className="mt-3 space-y-3 leading-relaxed text-gray-600"><p>Excel: giữ một sheet <b>Questions</b>, tiêu đề dòng 1. Thay ba câu ví dụ bằng câu của cậu. CSV dùng UTF-8. Nội dung và đáp án hỗ trợ Markdown, $LaTeX$, ảnh ![mô tả](URL). Câu Đúng/Sai điền trueFalse như true,false,true,false; để trống correctAnswer. Không dùng công thức Excel, hãy dán giá trị.</p><p>AI: sao chép hướng dẫn dưới đây, gửi cùng đề cho AI bên ngoài; dán JSON trả về rồi kiểm tra cả nội dung và đáp án. Website không gọi AI và không tự sửa câu bị lỗi.</p><textarea readOnly aria-label="Hướng dẫn cho AI bên ngoài" value={AI_IMPORT_PROMPT} rows={5} className="w-full rounded-lg border border-gray-200 bg-white p-2 font-mono" /><button type="button" onClick={() => void navigator.clipboard.writeText(AI_IMPORT_PROMPT).then(() => setMessage("Đã sao chép hướng dẫn AI.")).catch(() => setError("Không sao chép được. Cậu có thể chọn nội dung trong ô và sao chép thủ công."))} className="font-bold text-bkhn-red">Sao chép hướng dẫn AI</button></div></details>
    <fieldset disabled={pending} className="space-y-3 disabled:opacity-60">
      <input ref={fileInput} type="file" aria-label="Tệp câu hỏi" accept=".xlsx,.csv,.json" onChange={e => void choose(e.target.files?.[0])} className="w-full rounded-xl border border-dashed border-gray-300 p-3 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-bkhn-pale file:px-3 file:py-2 file:font-bold file:text-bkhn-red" />
      <div className="flex justify-between gap-2 text-xs"><span className="truncate text-gray-500">{source.filename}</span><button type="button" onClick={() => change({ filename: "questions.json", content: JSON.stringify(IMPORT_SAMPLE, null, 2) })} className="shrink-0 font-bold text-bkhn-red">Dùng JSON mẫu</button></div>
      {!/\.xlsx$/i.test(source.filename) && <textarea aria-label="Nội dung nhập JSON hoặc CSV" value={source.content} onChange={e => change({ ...source, content: e.target.value })} rows={7} className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 font-mono text-xs outline-none focus:border-bkhn-red" placeholder="Dán mảng JSON đã nhận từ AI…" />}
      <button type="button" onClick={() => void inspect()} disabled={!source.content.trim()} className="rounded-xl border border-bkhn-red px-4 py-2.5 text-xs font-bold text-bkhn-red disabled:opacity-50">Kiểm tra & xem trước</button>
    </fieldset>
    {preview && <div className="space-y-3 border-t border-gray-100 pt-4">
      <p className="text-sm font-bold">{preview.rows.length} dòng · {preview.rows.filter(row => row.errors.length).length} dòng cần sửa · {warningCount} dòng có lưu ý</p>
      {warningCount > 0 && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">Có câu hỏi trùng trong lần nhập này. Đây chỉ là lưu ý, không chặn lưu. Nếu duyệt, tất cả các câu — kể cả câu trùng — sẽ được thêm vào bài học.</p>}
      {preview.errors.map((text, i) => <p key={i} role="alert" className="text-sm text-red-700">{text}</p>)}
      <div className="max-h-[32rem] space-y-2 overflow-y-auto">{preview.rows.map(row => <details key={row.row} className={`rounded-xl border p-3 ${row.errors.length ? "border-red-200 bg-red-50" : row.warnings.length ? "border-amber-200 bg-amber-50" : "border-gray-200"}`} open={row.errors.length > 0}><summary className="cursor-pointer text-xs font-bold">Dòng {row.row}: {row.content.slice(0, 100)}{row.errors.length > 0 ? " · Có lỗi" : row.warnings.length ? " · Câu trùng · Vẫn có thể nhập" : " · Xem câu hỏi và đáp án"}</summary>{row.errors.map((text, i) => <p key={i} className="mt-2 text-xs text-red-700">{text}</p>)}{row.warnings.map((text, i) => <p key={i} className="mt-2 text-xs text-amber-800">{text}</p>)}{row.question && <div className="mt-3"><QuestionCard index={row.row} question={{ ...row.question, id: String(row.row), imageUrl: row.question.imageUrl ?? null, correctAnswer: row.question.correctAnswer ?? null, explanation: row.question.explanation ?? null, options: row.question.options ?? null, order: row.row }} /></div>}</details>)}</div>
      {invalid ? <p className="text-xs font-bold text-red-700">Sửa tệp/nội dung và kiểm tra lại. Chưa có câu nào được lưu.</p> : <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={approved} disabled={pending} onChange={e => setApproved(e.target.checked)} className="mt-1 accent-bkhn-red" />Tôi đã kiểm tra nội dung, công thức, ảnh, đáp án và lời giải của tất cả các câu.</label>}
      <button type="button" disabled={pending || invalid || !approved} onClick={() => void commit()} className="rounded-xl bg-bkhn-red px-4 py-3 text-sm font-bold text-white disabled:opacity-40">Duyệt & thêm {preview.rows.length} câu hỏi</button>
    </div>}
    {pending && <p role="status" className="text-xs text-gray-500">Đang xử lý…</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="text-sm text-green-700">{message}</p>}
  </section>;
}
