import type { ProjectRoleValue, SystemRoleValue, WorkspaceRoleValue } from "@/lib/constants";

export function canAccessAllWorkspaces(role?: SystemRoleValue | null) {
  return role === "SUPER_ADMIN";
}

export function canCreateWorkspace(role?: SystemRoleValue | null) {
  return canAccessAllWorkspaces(role);
}

export function canManageWorkspace(role: WorkspaceRoleValue) {
  return role === "OWNER" || role === "ADMIN";
}

export function canManageProject(role?: ProjectRoleValue | null) {
  return role === "LEAD";
}

export function canEditProjectContent(role?: ProjectRoleValue | null) {
  return role === "LEAD" || role === "MEMBER";
}

export function canChangeRole(actorRole: WorkspaceRoleValue, targetRole: WorkspaceRoleValue) {
  if (actorRole !== "OWNER") return targetRole === "MEMBER";
  return true;
}
