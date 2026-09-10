"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Edit3, ChevronDown, ChevronRight, Loader2, FileText, Video, ArrowLeft, ListChecks, FolderOpen, BookOpen, Folder, ArrowRight, AlertTriangle } from "lucide-react";

type Lesson = { id: string; title: string; order: number; videoUrl: string | null; documentUrl: string | null; exerciseUrl: string | null; answerUrl: string | null; };
type Chapter = { id: string; title: string; order: number; lessons: Lesson[]; };
type Subject = { id: string; title: string; description: string | null; order: number; chapters: Chapter[]; };
type Stage = { id: string; title: string; description: string | null; color: string | null; order: number; subjects: Subject[]; };
type Course = { id: string; title: string; description: string | null; stages: Stage[]; };

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // STATE ĐIỀU HƯỚNG TẦNG (Drill-down logic)
  const [activeStage, setActiveStage] = useState<Stage | null>(null);
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set());

  // STATE MODALS NHẬP LIỆU
  const [stageModal, setStageModal] = useState<{ open: boolean; editing: Stage | null }>({ open: false, editing: null });
  const [subjectModal, setSubjectModal] = useState<{ open: boolean; stageId: string | null; editing: Subject | null }>({ open: false, stageId: null, editing: null });
  const [chapterModal, setChapterModal] = useState<{ open: boolean; subjectId: string | null; editing: Chapter | null }>({ open: false, subjectId: null, editing: null });
  const [lessonModal, setLessonModal] = useState<{ open: boolean; chapterId: string | null; editing: Lesson | null }>({ open: false, chapterId: null, editing: null });

  // STATE MODAL XÓA 2 BƯỚC
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; type: 'stage' | 'subject' | 'chapter' | 'lesson' | ''; step: 1 | 2 }>({ open: false, id: "", type: "", step: 1 });

  // Input States
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [lessonDocUrl, setLessonDocUrl] = useState("");
  const [lessonExerciseUrl, setLessonExerciseUrl] = useState("");
  const [lessonAnswerUrl, setLessonAnswerUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCourse = async () => {
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`);
      const data = await res.json();
      if (data.success) {
        setCourse(data.course);
        if (activeStage) setActiveStage(data.course.stages.find((s: Stage) => s.id === activeStage.id) || null);
        if (activeSubject) setActiveSubject(data.course.stages.flatMap((s: Stage) => s.subjects).find((sub: Subject) => sub.id === activeSubject.id) || null);
      }
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  useEffect(() => { if (courseId) fetchCourse(); }, [courseId]);

  const toggleChapter = (id: string) => {
    setOpenChapters(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  // --- SUBMIT HANDLERS (Tạo/Sửa) ---
  const handleStageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle) return;
    setIsSubmitting(true);
    try {
      const editing = stageModal.editing;
      const payload = editing 
        ? { title: formTitle, description: formDesc, color: "#10b981" } 
        : { courseId, title: formTitle, description: formDesc, color: "#10b981" };

      const res = await fetch(editing ? `/api/admin/stages/${editing.id}` : "/api/admin/stages", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if ((await res.json()).success) { await fetchCourse(); setStageModal({ open: false, editing: null }); }
    } finally { setIsSubmitting(false); }
  };

  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle) return;
    setIsSubmitting(true);
    try {
      const editing = subjectModal.editing;
      const res = await fetch(editing ? `/api/admin/subjects/${editing.id}` : "/api/admin/subjects", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { title: formTitle, description: formDesc } : { stageId: subjectModal.stageId, title: formTitle, description: formDesc }),
      });
      if ((await res.json()).success) { await fetchCourse(); setSubjectModal({ open: false, stageId: null, editing: null }); }
    } finally { setIsSubmitting(false); }
  };

  const handleChapterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const editing = chapterModal.editing;
      const res = await fetch(editing ? `/api/admin/chapters/${editing.id}` : "/api/admin/chapters", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { title: formTitle } : { subjectId: chapterModal.subjectId, title: formTitle }),
      });
      if ((await res.json()).success) { await fetchCourse(); setChapterModal({ open: false, subjectId: null, editing: null }); }
    } finally { setIsSubmitting(false); }
  };

  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const editing = lessonModal.editing;
      const payload = { title: formTitle, videoUrl: lessonVideoUrl, documentUrl: lessonDocUrl, exerciseUrl: lessonExerciseUrl, answerUrl: lessonAnswerUrl, ...(editing ? {} : { chapterId: lessonModal.chapterId }) };
      const res = await fetch(editing ? `/api/admin/lessons/${editing.id}` : "/api/admin/lessons", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if ((await res.json()).success) { await fetchCourse(); setLessonModal({ open: false, chapterId: null, editing: null }); }
    } finally { setIsSubmitting(false); }
  };

  // --- LOGIC XÓA 2 BƯỚC ---
  const initiateDelete = (id: string, type: 'stage' | 'subject' | 'chapter' | 'lesson') => {
    setDeleteModal({ open: true, id, type, step: 1 });
  };

  const handleConfirmDelete = async () => {
    if (deleteModal.step === 1) {
      setDeleteModal(prev => ({ ...prev, step: 2 }));
      return;
    }

    const { id, type } = deleteModal;
    let endpoint = "";
    if (type === 'stage') endpoint = `/api/admin/stages/${id}`;
    else if (type === 'subject') endpoint = `/api/admin/subjects/${id}`;
    else if (type === 'chapter') endpoint = `/api/admin/chapters/${id}`;
    else if (type === 'lesson') endpoint = `/api/admin/lessons/${id}`;

    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        if (type === 'stage' && activeStage?.id === id) { setActiveStage(null); setActiveSubject(null); }
        if (type === 'subject' && activeSubject?.id === id) setActiveSubject(null);
        fetchCourse();
        setDeleteModal({ open: false, id: "", type: "", step: 1 });
      } else {
        alert(data.message || "Lỗi khi xóa!");
      }
    } catch (error) {
      alert("Lỗi kết nối đến máy chủ.");
    }
  };

  if (isLoading) return <div className="flex justify-center items-center py-20"><Loader2 className="animate-spin text-bkhn-red" size={40} /></div>;
  if (!course) return <div className="text-center py-20 text-gray-500 font-medium">Không tìm thấy khóa học.</div>;

  return (
    <>
      <div className="space-y-6 animate-fade-up max-w-5xl mx-auto pb-20">
        
        {/* 1. BREADCRUMB HEADER */}
        <div className="flex items-center gap-2 text-sm font-bold text-gray-500 overflow-x-auto whitespace-nowrap px-1">
          <Link href="/dashboard/courses" className="hover:text-bkhn-red transition-colors flex items-center gap-1">
            <ArrowLeft size={16} /> Quản lý Khóa học
          </Link>
          
          <ChevronRight size={14} className="text-gray-400" />
          <button 
            onClick={() => { setActiveStage(null); setActiveSubject(null); }} 
            className={`transition-colors ${!activeStage ? 'text-gray-900 font-black' : 'hover:text-bkhn-red'}`}
          >
            {course.title}
          </button>

          {activeStage && (
            <>
              <ChevronRight size={14} className="text-gray-400" />
              <button 
                onClick={() => setActiveSubject(null)} 
                className={`transition-colors ${!activeSubject ? 'text-gray-900 font-black' : 'hover:text-bkhn-red'}`}
              >
                {activeStage.title}
              </button>
            </>
          )}

          {activeSubject && (
            <>
              <ChevronRight size={14} className="text-gray-400" />
              <span className="text-gray-900 font-black">{activeSubject.title}</span>
            </>
          )}
        </div>

        {/* 2. KHUNG TIÊU ĐỀ KÈM MÔ TẢ */}
        <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-bkhn-pink flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 bg-bkhn-rose rounded-2xl flex items-center justify-center text-bkhn-red border border-bkhn-pink flex-shrink-0">
            <BookOpen size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              {!activeStage ? course.title : !activeSubject ? activeStage.title : activeSubject.title}
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-1.5 leading-relaxed">
              {!activeStage 
                ? course.description || "Chưa có mô tả chi tiết." 
                : !activeSubject 
                  ? activeStage.description || "Chưa có mô tả chi tiết." 
                  : activeSubject.description || "Chưa có mô tả chi tiết."}
            </p>
          </div>
        </div>

        {/* 3. NÚT THÊM MỚI TƯƠNG ỨNG TỪNG TẦNG */}
        <div className="flex justify-end">
          {!activeStage ? (
            <button onClick={() => { setStageModal({ open: true, editing: null }); setFormTitle(""); setFormDesc(""); }} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-3.5 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/30 flex items-center gap-2 text-sm">
              <Plus size={18} strokeWidth={3} /> Thêm Giai đoạn mới
            </button>
          ) : !activeSubject ? (
            <button onClick={() => { setSubjectModal({ open: true, stageId: activeStage.id, editing: null }); setFormTitle(""); setFormDesc(""); }} className="bg-blue-600 text-white font-bold px-6 py-3.5 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/30 flex items-center gap-2 text-sm">
              <Plus size={18} strokeWidth={3} /> Thêm Môn học mới
            </button>
          ) : (
            <button onClick={() => { setChapterModal({ open: true, subjectId: activeSubject.id, editing: null }); setFormTitle(""); }} className="bg-yellow-500 text-white font-bold px-6 py-3.5 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-yellow-500/30 flex items-center gap-2 text-sm">
              <Plus size={18} strokeWidth={3} /> Thêm Cụm kiến thức
            </button>
          )}
        </div>

        {/* TẦNG 1: HIỂN THỊ DANH SÁCH GIAI ĐOẠN */}
        {!activeStage && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {course.stages.length === 0 && <div className="col-span-full text-center py-12 text-gray-500 border border-dashed border-gray-300 rounded-3xl font-medium">Chưa có giai đoạn nào. Hãy thêm giai đoạn đầu tiên!</div>}
            {course.stages.map(stage => (
              <div key={stage.id} onClick={() => setActiveStage(stage)} className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-gray-100 hover:border-emerald-200 hover:shadow-xl hover:-translate-y-1 cursor-pointer transition-all duration-300 relative overflow-hidden group flex flex-col justify-between min-h-[220px]">
                
                <div className="absolute top-0 left-0 w-full h-1.5 opacity-90 transition-colors bg-emerald-600" />
                
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h2 className="text-xl font-black text-gray-900 group-hover:text-emerald-600 transition-colors flex items-center gap-2">
                      <FolderOpen size={22} className="text-emerald-500 group-hover:text-emerald-600 transition-colors" /> 
                      {stage.title}
                    </h2>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setStageModal({ open: true, editing: stage }); setFormTitle(stage.title); setFormDesc(stage.description || ""); }} className="p-2 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600 rounded-xl transition-colors"><Edit3 size={16} /></button>
                      <button onClick={() => initiateDelete(stage.id, 'stage')} className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-500 font-medium leading-relaxed line-clamp-2 mb-4">
                    {stage.description || "Chưa có mô tả chi tiết."}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {stage.subjects.slice(0, 3).map(sub => (
                      <span key={sub.id} className="text-[11px] font-bold bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-md border border-emerald-100">{sub.title}</span>
                    ))}
                    {stage.subjects.length > 3 && <span className="text-[11px] font-bold bg-gray-50 text-gray-400 px-2.5 py-1 rounded-md">+{stage.subjects.length - 3} môn</span>}
                    {stage.subjects.length === 0 && <span className="text-[11px] text-gray-400 italic">Chưa có môn học</span>}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                    <span>Tiến độ xây dựng</span>
                    <span className="text-emerald-500">0%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-1.5 rounded-full w-0 transition-all duration-700"></div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

        {/* TẦNG 2: HIỂN THỊ DANH SÁCH MÔN HỌC (ĐÃ TĂNG GAP VÀ HIỆU ỨNG CARD) */}
        {activeStage && !activeSubject && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {activeStage.subjects.length === 0 && <div className="col-span-full text-center py-10 text-gray-500 border border-dashed border-gray-300 rounded-3xl">Chưa có môn học nào trong giai đoạn này.</div>}
            {activeStage.subjects.map(subject => (
              <div key={subject.id} onClick={() => setActiveSubject(subject)} className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-gray-100 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer transition-all duration-300 flex flex-col justify-between group h-full min-h-[160px]">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                      <BookOpen className="text-blue-500" size={18} /> {subject.title}
                    </h3>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setSubjectModal({ open: true, stageId: null, editing: subject }); setFormTitle(subject.title); setFormDesc(subject.description || ""); }} className="p-1.5 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600 rounded-lg transition-colors"><Edit3 size={15} /></button>
                      <button onClick={() => initiateDelete(subject.id, 'subject')} className="p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"><Trash2 size={15} /></button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mt-2">{subject.description || "Môn học cơ bản"}</p>
                </div>
                <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-gray-400 pt-3 border-t border-gray-50">
                  <span>{subject.chapters.length} Cụm kiến thức</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TẦNG 3: HIỂN THỊ CỤM KIẾN THỨC VÀ BÀI HỌC */}
        {activeSubject && (
          <div className="space-y-4 animate-fade-in">
            {activeSubject.chapters.length === 0 && <div className="text-center py-10 text-gray-500 border border-dashed border-gray-300 rounded-3xl">Chưa có cụm kiến thức nào.</div>}
            {activeSubject.chapters.map(chapter => {
              const isChapterOpen = openChapters.has(chapter.id);
              return (
                <div key={chapter.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggleChapter(chapter.id)}>
                    <div className="flex items-center gap-3 font-bold text-gray-800">
                      {isChapterOpen ? <ChevronDown className="text-gray-500" size={18} /> : <ChevronRight className="text-gray-400" size={18} />}
                      <Folder className="text-yellow-500" size={20} />
                      {chapter.title} <span className="text-xs font-medium text-gray-400 ml-2">({chapter.lessons.length} bài)</span>
                    </div>
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setLessonModal({ open: true, chapterId: chapter.id, editing: null }); setFormTitle(""); setLessonVideoUrl(""); setLessonDocUrl(""); setLessonExerciseUrl(""); setLessonAnswerUrl(""); }} className="text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"><Plus size={14} /> Thêm Bài</button>
                      <button onClick={() => { setChapterModal({ open: true, subjectId: null, editing: chapter }); setFormTitle(chapter.title); }} className="p-2 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600 rounded-lg transition-colors"><Edit3 size={15} /></button>
                      <button onClick={() => initiateDelete(chapter.id, 'chapter')} className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"><Trash2 size={15} /></button>
                    </div>
                  </div>

                  {isChapterOpen && (
                    <div className="p-3 bg-gray-50 border-t border-gray-100 space-y-2">
                      {chapter.lessons.length === 0 && <p className="text-xs text-gray-400 italic py-2 ml-4">Chưa có bài học nào.</p>}
                      {chapter.lessons.map(lesson => (
                        <div key={lesson.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200 hover:border-bkhn-pink group transition-colors ml-4">
                          <div className="flex items-center gap-3 text-sm font-semibold text-gray-800">
                            {lesson.videoUrl ? <Video size={16} className="text-bkhn-red" /> : <FileText size={16} className="text-gray-400" />} {lesson.title}
                          </div>
                          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/dashboard/lessons/${lesson.id}/questions`} className="p-1.5 text-bkhn-red bg-bkhn-pale rounded-lg flex items-center gap-1 text-xs font-bold px-2"><ListChecks size={14} /> Web Test</Link>
                            <button onClick={() => { setLessonModal({ open: true, chapterId: chapter.id, editing: lesson }); setFormTitle(lesson.title); setLessonVideoUrl(lesson.videoUrl || ""); setLessonDocUrl(lesson.documentUrl || ""); setLessonExerciseUrl(lesson.exerciseUrl || ""); setLessonAnswerUrl(lesson.answerUrl || ""); }} className="p-1.5 text-gray-500 hover:bg-yellow-50 hover:text-yellow-600 rounded-lg bg-gray-50 transition-colors"><Edit3 size={14} /></button>
                            <button onClick={() => initiateDelete(lesson.id, 'lesson')} className="p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg bg-gray-50 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- MODALS NHẬP LIỆU --- */}
      
      {/* Modal Giai đoạn */}
      {stageModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-[420px] w-full p-8 shadow-2xl animate-fade-in">
            <h3 className="text-2xl font-black mb-6 text-center text-gray-900">{stageModal.editing ? "Chỉnh sửa" : "Thêm mới"}</h3>
            <form onSubmit={handleStageSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Tên <span className="text-red-500">*</span>
                </label>
                <input type="text" required autoFocus value={formTitle} onChange={e => setFormTitle(e.target.value)} className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Mô tả</label>
                <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium resize-none focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all" rows={4}/>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setStageModal({ open: false, editing: null })} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl text-sm transition-colors">Hủy</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl text-sm flex justify-center items-center shadow-md transition-all">{isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Lưu"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Môn học */}
      {subjectModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-[420px] w-full p-8 shadow-2xl animate-fade-in">
            <h3 className="text-2xl font-black mb-6 text-center text-gray-900">{subjectModal.editing ? "Chỉnh sửa" : "Thêm mới"}</h3>
            <form onSubmit={handleSubjectSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Tên <span className="text-red-500">*</span>
                </label>
                <input type="text" required autoFocus value={formTitle} onChange={e => setFormTitle(e.target.value)} className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Mô tả</label>
                <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium resize-none focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all" rows={4}/>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setSubjectModal({ open: false, stageId: null, editing: null })} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl text-sm transition-colors">Hủy</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-sm flex justify-center items-center shadow-md transition-all">{isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Lưu"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chapter */}
      {chapterModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl animate-fade-in"><h3 className="text-2xl font-black mb-6 text-center text-gray-900">{chapterModal.editing ? "Chỉnh sửa" : "Tạo mới"}</h3><form onSubmit={handleChapterSubmit} className="space-y-5"><div><label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Tên cụm <span className="text-red-500">*</span></label><input type="text" required autoFocus value={formTitle} onChange={e => setFormTitle(e.target.value)} className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 focus:bg-white transition-all" /></div><div className="flex gap-3 pt-4"><button type="button" onClick={() => setChapterModal({ open: false, subjectId: null, editing: null })} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl text-sm transition-colors">Hủy</button><button type="submit" disabled={isSubmitting} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all">{isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Lưu"}</button></div></form></div>
        </div>
      )}

      {/* Modal Lesson */}
      {lessonModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl my-4 animate-fade-in"><h3 className="text-2xl font-black mb-6 text-center text-gray-900">{lessonModal.editing ? "Chỉnh sửa" : "Thêm mới"}</h3><form onSubmit={handleLessonSubmit} className="space-y-4"><div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Tên bài học <span className="text-red-500">*</span></label><input type="text" required value={formTitle} onChange={e => setFormTitle(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:border-bkhn-red focus:outline-none focus:ring-4 focus:ring-bkhn-red/10" /></div><div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Link YouTube</label><input type="text" value={lessonVideoUrl} onChange={e => setLessonVideoUrl(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:border-bkhn-red focus:outline-none focus:ring-4 focus:ring-bkhn-red/10" /></div><div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Tài liệu học (PDF)</label><input type="text" value={lessonDocUrl} onChange={e => setLessonDocUrl(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:border-bkhn-red focus:outline-none focus:ring-4 focus:ring-bkhn-red/10" /></div><div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Bài tập (PDF)</label><input type="text" value={lessonExerciseUrl} onChange={e => setLessonExerciseUrl(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:border-bkhn-red focus:outline-none focus:ring-4 focus:ring-bkhn-red/10" /></div><div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Đáp án (PDF)</label><input type="text" value={lessonAnswerUrl} onChange={e => setLessonAnswerUrl(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl text-sm focus:border-bkhn-red focus:outline-none focus:ring-4 focus:ring-bkhn-red/10" /></div><div className="flex gap-3 pt-4"><button type="button" onClick={() => setLessonModal({ open: false, chapterId: null, editing: null })} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl text-sm transition-colors">Hủy</button><button type="submit" disabled={isSubmitting} className="flex-1 bg-bkhn-red hover:bg-red-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all">{isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Lưu"}</button></div></form></div>
        </div>
      )}

      {/* --- MODAL XÁC NHẬN XÓA TỔNG HỢP (2 BƯỚC) --- */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-[400px] p-8 shadow-2xl border border-red-100 text-center animate-fade-up">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertTriangle size={32} strokeWidth={2.5} />
            </div>
            
            {deleteModal.step === 1 ? (
              <>
                <h3 className="text-xl font-black text-gray-900 mb-3">
                  {deleteModal.type === 'stage' ? 'Xóa Giai đoạn?' 
                  : deleteModal.type === 'subject' ? 'Xóa Môn học?' 
                  : deleteModal.type === 'chapter' ? 'Xóa Cụm kiến thức?' 
                  : 'Xóa Bài học?'}
                </h3>
                <p className="text-sm text-gray-500 font-medium mb-8 leading-relaxed">
                  Bạn có chắc chắn muốn xóa {deleteModal.type === 'stage' ? 'giai đoạn' : deleteModal.type === 'subject' ? 'môn học' : deleteModal.type === 'chapter' ? 'cụm kiến thức' : 'bài học'} này không? Toàn bộ nội dung bên trong sẽ bị xóa theo và không thể hoàn tác.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteModal({ open: false, id: "", type: "", step: 1 })} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl transition-colors text-sm">
                    Hủy
                  </button>
                  <button onClick={handleConfirmDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm">
                    Tiếp tục
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-black text-red-600 mb-3">Xác nhận xóa vĩnh viễn?</h3>
                <p className="text-sm text-gray-500 font-medium mb-8 leading-relaxed">
                  Hành động này sẽ xóa sạch dữ liệu. Bạn không thể khôi phục lại.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteModal({ open: false, id: "", type: "", step: 1 })} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl transition-colors text-sm">
                    Hủy bỏ
                  </button>
                  <button onClick={handleConfirmDelete} className="flex-1 bg-red-600 hover:bg-red-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-sm">
                    Xóa
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </>
  );
}
