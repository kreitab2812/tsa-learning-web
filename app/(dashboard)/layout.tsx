import StudentShell from "@/features/auth/components/student-shell";
import { Suspense } from "react";
import LoadingState from "@/components/ui/loading-state";
import { requirePageUser } from "@/server/auth/session";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="p-6 sm:p-10"><LoadingState label="Đang mở không gian học tập…" /></div>}><AuthenticatedStudent>{children}</AuthenticatedStudent></Suspense>;
}

async function AuthenticatedStudent({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  return <StudentShell sessionUser={user}>{children}</StudentShell>;
}
