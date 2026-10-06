// Local-only visual fixture. No authentication, app routes or database access.
// Run: node --import tsx tests/ui/visual-preview.tsx
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import AdminOverview from "../../features/admin/components/overview";
import Pagination from "../../features/admin/components/pagination";

async function main() {
  const styles = resolve("app/globals.css");
  const { css } = await postcss([tailwind()]).process(await readFile(styles, "utf8"), { from: styles });
  const content = renderToStaticMarkup(<div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8"><p className="text-xs text-gray-500">Kiểm thử bố cục · dữ liệu giả, không phải báo cáo thật</p><div className="space-y-3"><Pagination page={1} hasMore busy={false} itemCount={20} itemLabel="câu hỏi" onChange={() => {}} /><Pagination page={2} hasMore={false} busy={false} itemCount={7} itemLabel="câu hỏi" onChange={() => {}} /><Pagination page={2} hasMore busy itemCount={0} itemLabel="câu hỏi" onChange={() => {}} /></div><AdminOverview summary={{ courses: 1, subjects: 3, lessons: 24, questions: 120 }} /></div>);
  const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>UI review fixture</title><style>${css}body{font-family:Arial,sans-serif}</style><body>${content}</body></html>`;
  createServer((req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(req.url === "/mobile" ? '<!doctype html><title>Mobile UI review</title><body style="margin:0;background:#ddd;display:flex;justify-content:center"><iframe title="Giao diện rộng 390px" src="/" style="width:390px;height:95vh;border:0"></iframe></body>' : html);
  }).listen(4399, "127.0.0.1", () => console.log("Visual fixture: http://127.0.0.1:4399"));
}
void main();
