import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import LoginForm from "@/features/auth/components/login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/dashboard" : "/home");
  return <LoginForm />;
}
