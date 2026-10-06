import AdminShell from "@/features/auth/components/admin-shell";
import { Suspense } from "react";
import LoadingState from "@/components/ui/loading-state";
import { requirePageUser } from "@/server/auth/session";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="p-6 sm:p-10"><LoadingState label="Đang mở không gian quản lý…" /></div>}><AuthenticatedAdmin>{children}</AuthenticatedAdmin></Suspense>;
}

async function AuthenticatedAdmin({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser(true);
  return <AdminShell user={user}>{children}</AdminShell>;
}
