"use client";
import katex from "katex";
import "katex/dist/katex.min.css";
// Bật hỗ trợ công thức Hóa học kiểu \ce{H2O}, \ce{->}, ...
import "katex/contrib/mhchem";

// Nhận 1 chuỗi text bất kỳ, tự tìm các đoạn bọc trong $...$ và render
// thành công thức LaTeX, phần còn lại giữ nguyên là chữ thường.
export default function MathText({ text }: { text?: string | null }) {
  if (!text) return null;

  const parts = text.split(/(\$[^$]+\$)/g);

  return (
    <>
      {parts.map((part, idx) => {
        const isFormula = part.length > 2 && part.startsWith("$") && part.endsWith("$");
        if (!isFormula) return <span key={idx}>{part}</span>;

        const formula = part.slice(1, -1);
        try {
          const html = katex.renderToString(formula, { throwOnError: false });
          return <span key={idx} dangerouslySetInnerHTML={{ __html: html }} />;
        } catch {
          return <span key={idx}>{part}</span>;
        }
      })}
    </>
  );
}
