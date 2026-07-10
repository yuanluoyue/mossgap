import { redirect } from "next/navigation";

import { isAdminAuthenticated } from "@/lib/auth";
import { hasServerEnv } from "@/env";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 未配置环境变量时重定向到登录页
  if (!(await hasServerEnv())) {
    redirect("/admin/login");
  }

  const authed = await isAdminAuthenticated();
  if (!authed) {
    redirect("/admin/login");
  }

  return <AdminShell>{children}</AdminShell>;
}
