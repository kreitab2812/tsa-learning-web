"use client";
import { useEffect, useRef, useState } from "react";
import type { Subject } from "../types";
import { changedOrderGroups, moveSubjectItem, moveSubjectItemTo, type Direction } from "../order-draft";
import { subjectOrderSchema } from "../order-schema";
import { errorMessage } from "@/features/admin/api";

export function useSubjectOrder(subject: Subject | null, commit: (subject: Subject) => void) {
  const [draft, setDraft] = useState<{ base: Subject; value: Subject } | null>(null);
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const current = draft?.base.id === subject?.id ? draft : null;
  const groups = current ? changedOrderGroups(current.base, current.value) : [];
  const dirty = groups.length > 0;

  function discard() {
    if (pending.current) return;
    setDraft(null); setError(null);
  }
  function confirmLeave() {
    if (pending.current) { alert("Đang lưu thứ tự. Vui lòng đợi hoàn tất."); return false; }
    if (dirty && !confirm("Thứ tự chưa được lưu. Rời màn hình và bỏ các thay đổi này?")) return false;
    discard(); return true;
  }
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const onLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const next = new URL(link.href);
      if (next.pathname === location.pathname && next.search === location.search && next.hash) return;
      if (pending.current || !confirm("Thứ tự chưa được lưu. Rời màn hình và bỏ các thay đổi này?")) {
        event.preventDefault(); event.stopPropagation();
      } else { setDraft(null); setError(null); }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onLink, true);
    };
  }, [dirty]);

  function move(kind: "chapter" | "lesson", id: string, direction: Direction) {
    if (!subject || pending.current) return;
    setError(null);
    setDraft((previous) => {
      const active = previous?.base.id === subject.id && changedOrderGroups(previous.base, previous.value).length ? previous : null;
      const base = active?.base ?? subject;
      const value = moveSubjectItem(active?.value ?? subject, kind, id, direction);
      return changedOrderGroups(base, value).length ? { base, value } : null;
    });
  }
  async function save() {
    if (!current || !dirty || pending.current) return;
    pending.current = true; setSaving(true); setError(null);
    try {
      const result = subjectOrderSchema.safeParse({ groups });
      if (!result.success) throw new Error(result.error.issues[0].message);
      const response = await fetch(`/api/admin/subjects/${current.base.id}/order`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(result.data),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Không thể lưu thứ tự.");
      commit(current.value);
      setDraft(null);
    } catch (error) { setError(errorMessage(error)); }
    finally { pending.current = false; setSaving(false); }
  }
  function moveTo(kind: "chapter" | "lesson", id: string, targetId: string) {
    if (!subject || pending.current) return;
    setError(null);
    setDraft((previous) => {
      const active = previous?.base.id === subject.id ? previous : null;
      const base = active?.base ?? subject;
      const value = moveSubjectItemTo(active?.value ?? subject, kind, id, targetId);
      return changedOrderGroups(base, value).length ? { base, value } : null;
    });
  }
  return { subject: dirty ? current!.value : subject, dirty, saving, error,
    changedGroups: groups.length, move, moveTo, discard, save, confirmLeave };
}
