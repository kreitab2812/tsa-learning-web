import { requireAdmin } from "@/server/auth/session";
import AdminAccountSettings from "@/features/auth/components/admin-account-settings";

export default async function SettingsPage() {
  const user = await requireAdmin();
  return <AdminAccountSettings user={user} />;
}
