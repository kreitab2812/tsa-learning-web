"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LearningLessonView } from "./types";
import type { Answers } from "./quiz-session";

export function useLearningWorkflow(initial: LearningLessonView, unlock: string | null) {
  const [view, setView] = useState(initial);
  const [answers, setAnswers] = useState<Answers>(initial.workflow?.session?.answers ?? {});
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [online, setOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const state = useRef({ view: initial, answers: initial.workflow?.session?.answers ?? {} as Answers, dirty: false, conflict: false, busy: false, restored: false });
  const startRequest = useRef<string | null>(null);
  const retryAfter = useRef(0);
  const clock = useRef({ time: Date.parse(initial.workflow?.serverTime ?? new Date().toISOString()), at: 0 });
  const context = useMemo(() => ({ preview: initial.preview, unlock, showDrafts: initial.showDrafts, simulated: initial.simulated }), [initial.preview, initial.showDrafts, initial.simulated, unlock]);
  const storageKey = useCallback((id: string) => `tsa-quiz:${initial.viewerEmail}:${initial.preview}:${initial.id}:${id}`, [initial.viewerEmail, initial.preview, initial.id]);
  const persist = useCallback(() => {
    const current = state.current, session = current.view.workflow?.session;
    if (!session || session.result) return;
    try { localStorage.setItem(storageKey(session.id), JSON.stringify({ revision: session.revision, answers: current.answers })); }
    catch { setNotice("Trình duyệt không lưu được bản nháp trên máy. Giữ trang mở và kiểm tra trạng thái lưu máy chủ."); }
  }, [storageKey]);

  const request = useCallback(async (body: object) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(`/api/learning/lessons/${initial.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, ...context }), signal: controller.signal });
      const data = await response.json();
      if (!response.ok || !data.success) throw Object.assign(new Error(data.message || "Không thể xử lý yêu cầu."), { status: response.status });
      if (data.result.draft && state.current.view.workflow) {
        return { ...state.current.view, questions: data.result.draft.questions,
          workflow: { ...state.current.view.workflow, session: data.result.draft, serverTime: data.result.serverTime } } as LearningLessonView;
      }
      return data.result.view as LearningLessonView;
    } finally { clearTimeout(timeout); }
  }, [context, initial.id]);

  const apply = useCallback((next: LearningLessonView, sent?: string, forceConflict = false) => {
    const current = state.current, previous = current.view.workflow?.session, session = next.workflow?.session;
    clock.current = { time: Date.parse(next.workflow?.serverTime ?? new Date().toISOString()), at: performance.now() };
    if (session?.result || !session) {
      if (session?.result?.timedOut && current.dirty) setNotice("Đã hết giờ: máy chủ chấm bản nháp nhận trước hạn. Thay đổi chưa gửi kịp không được tính.");
      current.answers = session?.answers ?? {}; current.dirty = false; current.conflict = false;
      if (session) { try { localStorage.removeItem(storageKey(session.id)); } catch { /* Optional browser storage. */ } }
    } else if (!current.restored || previous?.id !== session.id) {
      current.answers = session.answers; current.dirty = false; current.conflict = false;
      try {
        const saved = localStorage.getItem(storageKey(session.id));
        if (saved) {
          const local = JSON.parse(saved);
          if (local.answers && typeof local.answers === "object" && !Array.isArray(local.answers) && JSON.stringify(local.answers) !== JSON.stringify(session.answers)) {
            current.answers = local.answers; current.dirty = true; current.conflict = local.revision !== session.revision;
            setNotice("Đã khôi phục bản nháp trên máy. Chỉ bản được máy chủ xác nhận trước hạn mới được tính điểm.");
          }
        }
      } catch { setNotice("Không đọc được bản nháp trên máy; đã lấy bản được máy chủ lưu."); }
    } else if (sent !== undefined) {
      current.dirty = JSON.stringify(current.answers) !== sent;
    } else if (current.dirty) {
      if (JSON.stringify(current.answers) === JSON.stringify(session.answers)) current.dirty = false;
      else if (previous?.revision !== session.revision || forceConflict) current.conflict = true;
    } else current.answers = session.answers;
    current.restored = true; current.view = next;
    if (session?.id === startRequest.current) startRequest.current = null;
    if (forceConflict && current.dirty && !session?.result) current.conflict = true;
    setView(next); setAnswers({ ...current.answers }); setDirty(current.dirty); setConflict(current.conflict); setReady(true);
    // Keep a conflicting local copy's original revision until the learner explicitly chooses.
    if (!current.conflict) persist();
  }, [persist, storageKey]);

  const action = useCallback(async (kind: string, extra: object = {}) => {
    const current = state.current;
    if (current.busy) return;
    if (current.conflict && ["SAVE", "SUBMIT"].includes(kind)) return;
    const session = current.view.workflow?.session;
    let body: object = { action: kind, ...extra };
    let sent: string | undefined;
    if (kind === "SAVE" || kind === "SUBMIT") {
      if (!session || session.result) return;
      sent = JSON.stringify(current.answers);
      body = { action: kind, sessionId: session.id, revision: session.revision, answers: current.answers };
    }
    if (kind === "START") { startRequest.current ??= crypto.randomUUID(); body = { action: kind, requestId: startRequest.current }; }
    current.busy = true; setPending(true); setError(null);
    try {
      const next = await request(body);
      apply(next, sent);
      if (kind === "START") startRequest.current = null;
    } catch (cause) {
      retryAfter.current = Date.now() + 10000;
      const status = typeof cause === "object" && cause !== null && "status" in cause ? cause.status : null;
      setError(cause instanceof Error && cause.name !== "AbortError" ? cause.message : "Chưa nhận được xác nhận từ máy chủ. Có thể thử đồng bộ/nộp lại cùng phiên; không tạo kết quả trùng.");
      if (status === 409) {
        try { apply(await request({ action: "SYNC" }), undefined, true); } catch { /* Keep draft until explicit sync succeeds. */ }
      }
    } finally { current.busy = false; setPending(false); }
  }, [apply, request]);

  useEffect(() => {
    clock.current.at = performance.now();
    void action("OPEN");
    let nextRetry = 0;
    const tick = window.setInterval(() => {
      const session = state.current.view.workflow?.session;
      const deadline = session?.deadlineAt && !session.result ? Date.parse(session.deadlineAt) : null;
      const seconds = deadline === null ? null : Math.max(0, Math.ceil((deadline - clock.current.time - (performance.now() - clock.current.at)) / 1000));
      setRemaining(seconds); setOnline(navigator.onLine);
      if (seconds === 0 && navigator.onLine && !state.current.busy && performance.now() >= nextRetry) { nextRetry = performance.now() + 15000; void action("SYNC"); }
    }, 1000);
    const reconnect = () => { setOnline(navigator.onLine); if (navigator.onLine) void action("SYNC"); };
    const focus = () => { if (document.visibilityState === "visible") reconnect(); };
    const leave = (event: BeforeUnloadEvent) => { if (state.current.dirty || state.current.busy) { persist(); event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("online", reconnect); window.addEventListener("offline", reconnect); window.addEventListener("beforeunload", leave); document.addEventListener("visibilitychange", focus);
    return () => { clearInterval(tick); window.removeEventListener("online", reconnect); window.removeEventListener("offline", reconnect); window.removeEventListener("beforeunload", leave); document.removeEventListener("visibilitychange", focus); };
  }, [action, persist]);

  const expired = remaining === 0;
  useEffect(() => {
    if (!ready || !dirty || pending || conflict || !online || expired) return;
    const timer = setTimeout(() => void action("SAVE"), Math.max(1500, retryAfter.current - Date.now()));
    return () => clearTimeout(timer);
  }, [answers, ready, dirty, pending, conflict, online, expired, action]);

  function changeAnswers(next: Answers) {
    const session = state.current.view.workflow?.session;
    if (!ready || session?.result || conflict || remaining === 0) return;
    state.current.answers = next; state.current.dirty = true; setAnswers(next); setDirty(true); persist();
  }
  function resolveConflict(useLocal: boolean) {
    if (!useLocal) state.current.answers = state.current.view.workflow?.session?.answers ?? {};
    state.current.conflict = false; state.current.dirty = useLocal;
    setConflict(false); setDirty(useLocal); setAnswers({ ...state.current.answers }); persist();
    setNotice(useLocal ? "Đã chọn bản trên máy; đang chờ máy chủ xác nhận." : "Đã chọn bản lưu trên máy chủ.");
  }
  return { view, answers, changeAnswers, action, ready, pending, dirty, conflict, resolveConflict, online, error, notice, remaining };
}
