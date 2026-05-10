"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, FolderKanban, LayoutDashboard, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { key: "overview", label: "总览", href: "", icon: LayoutDashboard },
  { key: "projects", label: "项目", href: "/projects", icon: FolderKanban },
  { key: "archived", label: "归档", href: "/projects/archived", icon: Archive },
  { key: "settings", label: "设置", href: "/settings/general", icon: Settings },
];

function activeKey(pathname: string, basePath: string) {
  if (pathname === basePath) return "overview";
  if (pathname.startsWith(`${basePath}/projects/archived`)) return "archived";
  if (pathname.startsWith(`${basePath}/projects`)) return "projects";
  if (pathname.startsWith(`${basePath}/settings`)) return "settings";
  return "";
}

export function WorkspaceNav({ workspaceSlug, showSettings }: { workspaceSlug: string; showSettings: boolean }) {
  const pathname = usePathname();
  const basePath = `/w/${workspaceSlug}`;
  const current = activeKey(pathname, basePath);
  const visibleItems = showSettings ? items : items.filter((item) => item.key !== "settings");

  return (
    <nav className="flex max-w-full flex-nowrap items-center gap-1 overflow-x-auto text-sm" aria-label="工作区菜单">
      {visibleItems.map((item) => {
        const active = item.key === current;
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            href={`${basePath}${item.href}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              active && "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.16)] hover:bg-primary/10 hover:text-primary",
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
