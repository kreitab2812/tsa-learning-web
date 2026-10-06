"use client";
import { useCallback, useEffect, useState } from "react";

export function useUnsavedChapters() {
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const setChapterDirty = useCallback((id: string, dirty: boolean) => {
    setDirtyIds((previous) => {
      if (previous.has(id) === dirty) return previous;
      const next = new Set(previous);
      if (dirty) next.add(id); else next.delete(id);
      return next;
    });
  }, []);
  const dirty = dirtyIds.size > 0;
  const confirmLeave = useCallback(() => !dirty || window.confirm("Nội dung cụm chưa lưu. Rời màn hình và bỏ thay đổi?"), [dirty]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank") return;
      const destination = new URL(link.href);
      if (destination.pathname === location.pathname && destination.search === location.search && destination.hash) return;
      if (!confirmLeave()) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", click, true); };
  }, [dirty, confirmLeave]);
  return { dirty, setChapterDirty, confirmLeave };
}
