"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CldUploadWidget } from "next-cloudinary";
import {
  Plus, Trash2, Edit3, Loader2, ArrowLeft, ImagePlus, X, CheckCircle2
} from "lucide-react";

type Option = { id: "A" | "B" | "C" | "D"; text: string };

type Question = {
  id: string;
  content: string;
  imageUrl: string | null;
  options: Option[];
  correctAnswer: string;
  explanation: string | null;
  order: number;
};

type Lesson = {
  id: string;
  title: string;
  chapter: { id: string; title: string; courseId: string };
  questions: Question[];
};

const EMPTY_OPTIONS: Option[] = [
  { id: "A", text: "" },
  { id: "B", text: "" },
  { id: "C", text: "" },
  { id: "D", text: "" },
];

export default function LessonQuestionsPage() {
  const params = useParams();
  const lessonId = params.lessonId as string;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [options, setOptions] = useState<Option[]>(EMPTY_OPTIONS);
  const [correctAnswer, setCorrectAnswer] = useState<string>("A");
  const [explanation, setExplanation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLesson = async () => {
    try {
      const res = await fetch(`/api/admin/lessons/${lessonId}`);
      const data = await res.json();
      if (data.success) setLesson(data.lesson);
    } catch (error) {
      console.error("Lỗi khi tải bài học:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (lessonId) fetchLesson();
  }, [lessonId]);

  const resetForm = () => {
    setContent("");
    setImageUrl(null);
    setOptions(EMPTY_OPTIONS);
    setCorrectAnswer("A");
    setExplanation("");
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (q: Question) => {
    setEditing(q);
    setContent(q.content);
    setImageUrl(q.imageUrl);
    setOptions(q.options?.length === 4 ? q.options : EMPTY_OPTIONS);
    setCorrectAnswer(q.correctAnswer);
    setExplanation(q.explanation || "");
    setModalOpen(true);
  };

  const handleOptionChange = (id: string, text: string) => {
    setOptions(prev => prev.map(o => (o.id === id ? { ...o, text } : o)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content || options.some(o => !o.text)) {
      alert("Vui lòng nhập đủ đề bài và cả 4 đáp án.");
      return;
    }
    setIsSubmitting(true);

    try {
      const payload = { lessonId, content, imageUrl, options, correctAnswer, explanation };
      const res = await fetch(
        editing ? `/api/admin/questions/${editing.id}` : "/api/admin/questions",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (data.success) {
        await fetchLesson();
        setModalOpen(false);
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert("Lỗi kết nối đến máy chủ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa câu hỏi này?")) return;
    const res = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) fetchLesson();
    else alert(data.message);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin text-bkhn-red" size={40} />
      </div>
    );
  }

  if (!lesson) {
    return <div className="text-center py-20 text-gray-500 font-medium">Không tìm thấy bài học.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl mx-auto">

      <div className="flex items-center gap-3">
        <Link href={`/dashboard/courses/${lesson.chapter.courseId}`} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">{lesson.title}</h1>
          <p className="text-gray-500 text-sm font-medium">{lesson.chapter.title} · Bài tập tương tác</p>
        </div>
      </div>

      <button
        onClick={openCreate}
        className="bg-bkhn-red hover:bg-red-700 text-white font-bold px-5 py-3 rounded-2xl transition-all shadow-bkhn-md flex items-center gap-2 active:scale-95 text-sm"
      >
        <Plus size={18} strokeWidth={3} /> Thêm câu hỏi
      </button>

      <div className="space-y-3">
        {lesson.questions.length === 0 && (
          <div className="text-center py-10 text-gray-500 font-medium bg-white rounded-3xl border border-dashed border-bkhn-pink">
            Chưa có câu hỏi nào. Hãy thêm câu hỏi đầu tiên!
          </div>
        )}

        {lesson.questions.map((q, idx) => (
          <div key={q.id} className="bg-white p-5 rounded-2xl border border-bkhn-pink shadow-bkhn-sm">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1">
                <span className="text-xs font-black text-bkhn-red">Câu {idx + 1}</span>
                <p className="font-semibold text-gray-900 mt-1">{q.content}</p>
                {q.imageUrl && (
                  <img src={q.imageUrl} alt="" className="mt-2 max-h-40 rounded-xl border border-gray-100" />
                )}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {q.options.map(o => (
                    <div
                      key={o.id}
                      className={`text-sm px-3 py-2 rounded-lg border flex items-center gap-1.5 ${
                        o.id === q.correctAnswer
                          ? "bg-green-50 border-green-200 text-green-700 font-bold"
                          : "bg-gray-50 border-gray-100 text-gray-600"
                      }`}
                    >
                      {o.id === q.correctAnswer && <CheckCircle2 size={14} />}
                      {o.id}. {o.text}
                    </div>
                  ))}
                </div>
                {q.explanation && (
                  <p className="text-xs text-gray-500 mt-3 italic">Giải thích: {q.explanation}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(q)} className="p-2 text-gray-500 hover:text-bkhn-red hover:bg-bkhn-pale rounded-lg">
                  <Edit3 size={16} />
                </button>
                <button onClick={() => handleDelete(q.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Question */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] max-w-lg w-full p-8 shadow-2xl border border-bkhn-pink my-8">
            <h3 className="text-xl font-black text-gray-900 mb-4">
              {editing ? "Sửa Câu hỏi" : "Thêm Câu hỏi mới"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Đề bài</label>
                <textarea
                  rows={3}
                  required
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Nhập nội dung câu hỏi..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-bkhn-red focus:bg-white transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Ảnh minh họa (nếu có)</label>
                {imageUrl ? (
                  <div className="relative w-fit">
                    <img src={imageUrl} alt="" className="max-h-40 rounded-xl border border-gray-200" />
                    <button
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <CldUploadWidget
                    uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
                    onSuccess={(result) => {
                      const info = result.info as { secure_url?: string };
                      if (info?.secure_url) setImageUrl(info.secure_url);
                    }}
                  >
                    {({ open }) => (
                      <button
                        type="button"
                        onClick={() => open()}
                        className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-sm font-bold text-gray-500 hover:border-bkhn-red hover:text-bkhn-red transition-colors"
                      >
                        <ImagePlus size={16} /> Tải ảnh lên
                      </button>
                    )}
                  </CldUploadWidget>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">4 Đáp án (chọn đáp án đúng)</label>
                <div className="space-y-2">
                  {options.map(o => (
                    <div key={o.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={correctAnswer === o.id}
                        onChange={() => setCorrectAnswer(o.id)}
                        className="w-4 h-4 accent-bkhn-red shrink-0"
                      />
                      <span className="font-black text-gray-700 w-5">{o.id}.</span>
                      <input
                        type="text"
                        required
                        value={o.text}
                        onChange={e => handleOptionChange(o.id, e.target.value)}
                        placeholder={`Đáp án ${o.id}`}
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:border-bkhn-red focus:bg-white transition-all"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Lời giải chi tiết</label>
                <textarea
                  rows={3}
                  value={explanation}
                  onChange={e => setExplanation(e.target.value)}
                  placeholder="Giải thích tại sao đáp án đúng là đáp án này..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-bkhn-red focus:bg-white transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl text-sm">
                  Hủy
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-bkhn-red hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm flex justify-center">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Lưu câu hỏi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
