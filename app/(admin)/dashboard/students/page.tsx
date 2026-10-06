import { requireAdmin } from "@/server/auth/session";
import StudentManager from "@/features/students/components/student-manager";

export default async function StudentsPage() {
  await requireAdmin();
  return <StudentManager />;
}
