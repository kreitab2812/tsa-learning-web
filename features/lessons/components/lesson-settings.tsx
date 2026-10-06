"use client";
import { Settings2 } from "lucide-react";
import type { LessonEditorValues } from "../editor-state";

const inputClass = "mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium focus:border-bkhn-red focus:outline-none";

export default function LessonSettings({ values, onChange }: {
  values: LessonEditorValues;
  onChange: <K extends keyof LessonEditorValues>(key: K, value: LessonEditorValues[K]) => void;
}) {
  return <details className="group rounded-2xl border border-bkhn-pink bg-white">
    <summary className="flex cursor-pointer list-none items-center gap-3 p-4 font-bold text-gray-800 [&::-webkit-details-marker]:hidden">
      <span className="rounded-xl bg-bkhn-pale p-2 text-bkhn-red"><Settings2 size={18} /></span>
      <span className="flex-1 text-sm">Cách học & bài kiểm tra<span className="mt-0.5 block text-xs font-medium text-gray-500">Tùy chỉnh theo nhịp học · Mặc định không gây áp lực</span></span>
      <span className="text-xs text-bkhn-red group-open:hidden">Mở cài đặt</span>
    </summary>
    <div className="space-y-4 border-t border-bkhn-pink p-4 sm:p-5">
      <p className="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">Quy tắc học được kiểm tra trên máy chủ. Đề, thứ tự đảo, thời hạn và điểm đạt được chốt khi bắt đầu mỗi lần làm; sửa cấu hình không đổi các phiên đã bắt đầu. Để trống thời gian/số lần nếu muốn học thoải mái.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-bold text-gray-600">Điều kiện hoàn thành
          <select value={values.completionMode} onChange={e => onChange("completionMode", e.target.value as LessonEditorValues["completionMode"])} className={inputClass}>
            <option value="MANUAL">Học viên tự đánh dấu (khuyến nghị)</option>
            <option value="QUIZ_SUBMITTED">Nộp bài tập, không yêu cầu điểm</option>
            <option value="QUIZ_PASSED">Đạt điểm bài tập được đặt bên dưới</option>
          </select>
        </label>
        <label className="text-xs font-bold text-gray-600">Điều hướng trong bài
          <select value={values.stepNavigation} onChange={e => onChange("stepNavigation", e.target.value as LessonEditorValues["stepNavigation"])} className={inputClass}>
            <option value="FREE">Tự do chọn phần học</option><option value="SEQUENTIAL">Lần lượt các phần có nội dung</option>
          </select>
        </label>
        <label className="text-xs font-bold text-gray-600">Điểm đạt từ (%)
          <input type="number" min={1} max={100} step={1} value={values.quizPassPercent} onChange={e => onChange("quizPassPercent", Number(e.target.value))} className={inputClass} />
          <span className="mt-1 block font-normal">Chỉ áp dụng khi bài có câu hỏi. Không có câu hỏi thì học viên tự đánh dấu hoàn thành.</span>
        </label>
        <label className="text-xs font-bold text-gray-600">Thời gian làm bài (phút)
          <input type="number" min={1} max={1440} step={1} placeholder="Không giới hạn" value={values.quizTimeLimitMinutes ?? ""} onChange={e => onChange("quizTimeLimitMinutes", e.target.value === "" ? null : Number(e.target.value))} className={inputClass} />
          <span className="mt-1 block font-normal">Để trống để học viên làm theo nhịp riêng.</span>
        </label>
        <label className="text-xs font-bold text-gray-600">Số lần làm tối đa
          <input type="number" min={1} max={100} step={1} placeholder="Làm lại không giới hạn" value={values.quizMaxAttempts ?? ""} onChange={e => onChange("quizMaxAttempts", e.target.value === "" ? null : Number(e.target.value))} className={inputClass} />
        </label>
      </div>
      <div className="grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
        {([
          ["requireCompletionForNext", "Yêu cầu hoàn thành trước khi mở bài kế tiếp"],
          ["quizShuffleQuestions", "Đảo thứ tự câu hỏi"],
          ["quizShuffleAnswers", "Đảo thứ tự đáp án"],
        ] as const).map(([key, label]) => <label key={key} className="flex items-start gap-2"><input type="checkbox" checked={values[key]} onChange={e => onChange(key, e.target.checked)} className="mt-1 accent-bkhn-red" />{label}</label>)}
      </div>
    </div>
  </details>;
}
