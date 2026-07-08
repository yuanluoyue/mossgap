import { getAuthPayload } from "@/lib/auth";
import { getAdminById, getAdminRoleIds, listSysRoles } from "@/db/queries";
import { ProfileForm } from "./profile-form";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const payload = await getAuthPayload();
  if (!payload) redirect("/admin/login");

  const admin = await getAdminById(payload.sub);
  if (!admin) redirect("/admin/login");

  const roleIds = await getAdminRoleIds(admin.id);
  let roleName = "未分配角色";
  if (roleIds.length > 0) {
    const allRoles = await listSysRoles();
    const found = allRoles.find((r) => r.id === roleIds[0]);
    if (found) roleName = found.name;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">个人信息</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          管理你的账号资料与安全设置
        </p>
      </div>

      <ProfileForm
        user={{
          id: admin.id,
          username: admin.username,
          email: admin.email,
          name: admin.name,
          avatar: admin.avatar,
          createdAt: admin.createdAt,
        }}
        roleName={roleName}
      />
    </div>
  );
}
