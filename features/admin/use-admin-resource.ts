"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { adminJson, errorMessage } from "./api";

/** No shared auth cache. A URL switch or unmount invalidates pending responses. */
export function useAdminResource<T>(url: string | null) {
  const [state, setState] = useState<{ url: string | null; data: T | null; error: string | null; busy: boolean }>({ url: null, data: null, error: null, busy: false });
  const generation = useRef(0);
  const inFlight = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    const version = ++generation.current;
    inFlight.current?.abort();
    if (!url) return;
    const controller = new AbortController();
    inFlight.current = controller;
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 30000);
    setState((previous) => ({ url, data: previous.url === url ? previous.data : null, error: null, busy: true }));
    try {
      const data = await adminJson<T>(url, { signal: controller.signal });
      if (version === generation.current) { setState({ url, data, error: null, busy: false }); return data; }
    } catch (error) {
      if (version === generation.current && (!controller.signal.aborted || timedOut)) setState((previous) => ({ ...previous, url, error: timedOut ? "Máy chủ phản hồi chậm. Dữ liệu đang có vẫn được giữ; hãy thử lại." : errorMessage(error), busy: false }));
    } finally {
      clearTimeout(timer);
      if (inFlight.current === controller) inFlight.current = null;
    }
  }, [url]);
  useEffect(() => {
    // Start asynchronously so a quick navigation can cancel before dispatch.
    let active = true;
    void Promise.resolve().then(() => { if (active) return refresh(); });
    // This ref is a request counter, not a DOM node: invalidate its latest value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { active = false; generation.current++; inFlight.current?.abort(); };
  }, [refresh]);
  const current = state.url === url;
  const setData = (update: (previous: T) => T) => setState((previous) =>
    previous.url === url && previous.data ? { ...previous, data: update(previous.data) } : previous);
  return { data: current ? state.data : null, error: current ? state.error : null,
    isLoading: Boolean(url) && (!current || state.busy), refresh, setData };
}
