"use client";
import ContentImage from "@/features/admin/components/content-image";
import QuizContent from "./quiz-content";
import { Trash2, Edit3, CheckCircle2, Copy, ArrowUp, ArrowDown } from "lucide-react";
import type { Option, Statement, Question } from "../types";
export default function QuestionCard({ question: q, index, onEdit, onDelete, onAction, busy, first, last }: { question: Question; index: number; onEdit?: (question: Question) => void; onDelete?: (id: string) => void; onAction?: (id: string, action: "duplicate" | "up" | "down") => void; busy?: boolean; first?: boolean; last?: boolean }) {
  return (
            <div className="bg-white p-5 rounded-2xl border border-bkhn-pink shadow-sm">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black text-bkhn-red">Câu {index}</span>
                    <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {q.type === "MULTIPLE_CHOICE" ? "Trắc nghiệm" : q.type === "TRUE_FALSE_GROUP" ? "Đúng/Sai" : "Trả lời ngắn"}
                    </span>
                  </div>
                  <div className="font-semibold text-gray-900"><QuizContent text={q.content} /></div>
                  {q.imageUrl && <ContentImage src={q.imageUrl} alt="" className="mt-2 max-h-40 rounded-xl border border-gray-100" />}

                  {q.type === "MULTIPLE_CHOICE" && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {(q.options as Option[]).map(o => (
                        <div key={o.id} className={`text-sm px-3 py-2 rounded-lg border flex items-center gap-1.5 ${o.id === q.correctAnswer ? "bg-green-50 border-green-200 text-green-700 font-bold" : "bg-gray-50 border-gray-100 text-gray-600"}`}>
                          {o.id === q.correctAnswer && <CheckCircle2 size={14} />}
                          {o.id}. <QuizContent text={o.text} />
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === "TRUE_FALSE_GROUP" && (
                    <div className="space-y-1.5 mt-3">
                      {(q.options as Statement[]).map(s => (
                        <div key={s.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                          <div className="text-gray-700"><span className="font-bold">{s.id})</span> <QuizContent text={s.text} /></div>
                          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${s.isTrue ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                            {s.isTrue ? "Đúng" : "Sai"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === "SHORT_ANSWER" && (
                    <p className="text-sm mt-3 px-3 py-2 rounded-lg bg-green-50 border border-green-100 text-green-700 font-bold inline-block">
                      Đáp án: {q.correctAnswer}
                    </p>
                  )}

                  {q.explanation && (
                    <div className="text-xs text-gray-500 mt-3">Giải thích: <QuizContent text={q.explanation} /></div>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {onAction && <><button type="button" disabled={busy || first} aria-label="Đưa câu hỏi lên" onClick={() => onAction(q.id, "up")} className="rounded-lg p-2 text-gray-500 hover:bg-bkhn-pale disabled:opacity-30"><ArrowUp size={16} /></button><button type="button" disabled={busy || last} aria-label="Đưa câu hỏi xuống" onClick={() => onAction(q.id, "down")} className="rounded-lg p-2 text-gray-500 hover:bg-bkhn-pale disabled:opacity-30"><ArrowDown size={16} /></button><button type="button" disabled={busy} aria-label="Nhân bản câu hỏi" onClick={() => onAction(q.id, "duplicate")} className="rounded-lg p-2 text-gray-500 hover:bg-bkhn-pale disabled:opacity-30"><Copy size={16} /></button></>}
                  {onEdit && <button disabled={busy} aria-label="Sửa câu hỏi" onClick={() => onEdit(q)} className="p-2 text-gray-500 hover:text-bkhn-red hover:bg-bkhn-pale rounded-lg"><Edit3 size={16} /></button>}
                  {onDelete && <button disabled={busy} aria-label="Xóa câu hỏi" onClick={() => onDelete(q.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>}
                </div>
              </div>
            </div>
  );
}
