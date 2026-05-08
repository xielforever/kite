import type { ProjectRoleValue, SystemRoleValue } from "@/lib/constants";

export function canAccessAllWorkspaces(role?: SystemRoleValue | null) {
  return role === "SUPER_ADMIN";
}

export function canCreateWorkspace(role?: SystemRoleValue | null) {
  return canAccessAllWorkspaces(role);
}

export function canManageProject(role?: ProjectRoleValue | null) {
  return role === "LEAD";
}

export function canEditProjectContent(role?: ProjectRoleValue | null) {
  return role === "LEAD" || role === "MEMBER";
}
