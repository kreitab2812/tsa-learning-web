"use client";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { adminJson, errorMessage } from "@/features/admin/api";
import RequestError from "@/features/admin/components/request-error";

export default function PasswordForm({ compact = false }: { compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const input = "mt-2 block w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none focus:border-bkhn-red focus:bg-white";
  return <form className={`space-y-4 ${compact ? "" : "max-w-md"}`} onSubmit={async (event) => {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    if (data.get("newPassword") !== data.get("confirm")) { setError("Hai mật khẩu mới chưa khớp."); return; }
    setBusy(true); setError(null);
    try {
      await adminJson("/api/admin/account/password", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: data.get("currentPassword"), newPassword: data.get("newPassword") }) });
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Password change revokes all sessions and cached private UI.
      window.location.assign("/?passwordChanged=1");
    } catch (error) { setError(errorMessage(error)); setBusy(false); }
  }}>
    {!compact && <><h2 className="text-xl font-bold">Đổi mật khẩu</h2><p className="text-sm text-gray-600">Tối thiểu 12 ký tự. Đổi thành công sẽ đăng xuất tất cả các phiên.</p></>}
    <div className="flex items-center justify-between gap-3"><p className="text-xs leading-5 text-gray-500">Mật khẩu mới cần ít nhất 12 ký tự.</p><button type="button" onClick={() => setVisible(value => !value)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-bold text-gray-500 hover:bg-gray-100">{visible ? <EyeOff size={14} /> : <Eye size={14} />}{visible ? "Ẩn" : "Hiện"}</button></div>
    <label className="block text-xs font-bold text-gray-600">Mật khẩu hiện tại<input className={input} name="currentPassword" type={visible ? "text" : "password"} autoComplete="current-password" required maxLength={128} /></label>
    <label className="block text-xs font-bold text-gray-600">Mật khẩu mới<input className={input} name="newPassword" type={visible ? "text" : "password"} autoComplete="new-password" required minLength={12} maxLength={128} /></label>
    <label className="block text-xs font-bold text-gray-600">Nhập lại mật khẩu mới<input className={input} name="confirm" type={visible ? "text" : "password"} autoComplete="new-password" required minLength={12} maxLength={128} /></label>
    <RequestError message={error} />
    <button disabled={busy} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50">{busy && <Loader2 size={15} className="animate-spin" />}{busy ? "Đang lưu…" : "Đổi mật khẩu và đăng xuất"}</button>
  </form>;
}
