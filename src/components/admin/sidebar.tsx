"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gamepad2, LayoutDashboard, ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import { AdminLogoutButton } from "@/components/admin/logout-button";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Gamepad2;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "控制台", icon: LayoutDashboard, exact: true },
  { href: "/admin/games", label: "游戏管理", icon: Gamepad2 },
];

interface AdminSidebarProps {
  collapsed: boolean;
}

export function AdminSidebar({ collapsed }: AdminSidebarProps) {
  const pathname = usePathname();

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return (
    <aside
      className={cn(
        "relative z-50 flex flex-col border-r bg-background transition-all duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-14 items-center border-b",
          collapsed ? "justify-center px-2" : "px-4",
        )}
      >
        <Link href="/admin" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Gamepad2 className="size-5" />
          </span>
          {!collapsed && (
            <span className="font-heading text-sm font-bold tracking-wider">
              MOSS<span className="text-primary">GAP</span>
            </span>
          )}
        </Link>
      </div>

      {/* 导航 */}
      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* 底部 */}
      <div className="space-y-1 border-t p-2">
        <Link
          href="/"
          target="_blank"
          title={collapsed ? "访问前台" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          <ExternalLink className="size-4 shrink-0" />
          {!collapsed && "访问前台"}
        </Link>
        {collapsed ? (
          <div className="flex justify-center px-0 py-2">
            <AdminLogoutButton collapsed />
          </div>
        ) : (
          <AdminLogoutButton />
        )}
      </div>
    </aside>
  );
}
