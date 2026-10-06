import { requireAdmin } from "@/server/auth/session";
import { getAdminSummary } from "@/server/admin/dashboard-queries";
import AdminOverview from "@/features/admin/components/overview";

export default async function AdminDashboard() {
  await requireAdmin();
  return <AdminOverview summary={await getAdminSummary()} />;
}
