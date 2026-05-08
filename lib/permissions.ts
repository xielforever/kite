import { redirect } from "next/navigation";
import { forbidden } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessAllWorkspaces, canCreateWorkspace, canEditProjectContent, canManageProject } from "@/lib/role-rules";
export {
  canAccessAllWorkspaces,
  canChangeRole,
  canCreateWorkspace,
  canEditProjectContent,
  canManageProject,
  canManageWorkspace,
} from "@/lib/role-rules";

export class ForbiddenError extends Error {
  constructor(message = "没有权限执行此操作") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, systemRole: true, mustChangePassword: true },
  });
  if (!user) redirect("/api/auth/session-expired");
  return user;
}

export async function requireSystemAdmin() {
  const user = await requireUser();
  if (!canCreateWorkspace(user.systemRole)) forbidden();
  return user;
}

export async function getWorkspaceMembership(workspaceSlug: string, userId: string) {
  const projectMembership = await prisma.projectMember.findFirst({
    where: {
      userId,
      project: { workspace: { slug: workspaceSlug } },
    },
    include: { project: { include: { workspace: true } } },
  });
  if (!projectMembership) return null;
  const workspace = projectMembership.project.workspace;
  return {
    id: "__project_access__",
    workspaceId: workspace.id,
    userId,
    role: "MEMBER" as const,
    workspace,
    createdAt: projectMembership.createdAt,
    updatedAt: projectMembership.updatedAt,
  };
}

export async function requireWorkspace(workspaceSlug: string) {
  const user = await requireUser();
  if (canAccessAllWorkspaces(user.systemRole)) {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
    });
    if (!workspace) forbidden();
    return {
      user,
      workspace,
      membership: {
        id: "__system_admin__",
        workspaceId: workspace.id,
        userId: user.id,
        role: "OWNER" as const,
        workspace,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
      },
      isSystemAdmin: true,
    };
  }

  const membership = await getWorkspaceMembership(workspaceSlug, user.id);
  if (!membership) forbidden();
  return { user, membership, workspace: membership.workspace, isSystemAdmin: false };
}

export async function requireWorkspaceAdmin(workspaceSlug: string) {
  const result = await requireWorkspace(workspaceSlug);
  if (!result.isSystemAdmin) {
    forbidden();
  }
  return result;
}

export async function requireProject(workspaceSlug: string, projectKey: string) {
  const context = await requireWorkspace(workspaceSlug);
  const project = await prisma.project.findFirst({
    where: {
      key: projectKey,
      workspaceId: context.workspace.id,
      ...(context.isSystemAdmin ? {} : { members: { some: { userId: context.user.id } } }),
    },
  });
  if (!project) forbidden();
  const projectMembership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: project.id, userId: context.user.id } },
  });
  const projectRole = projectMembership?.role ?? null;
  return {
    ...context,
    project,
    projectMembership,
    projectRole,
    canManageProject: context.isSystemAdmin || canManageProject(projectRole),
    canEditProject: context.isSystemAdmin || canEditProjectContent(projectRole),
  };
}

export async function requireProjectAdmin(workspaceSlug: string, projectKey: string) {
  const context = await requireProject(workspaceSlug, projectKey);
  if (!context.canManageProject) {
    forbidden();
  }
  return context;
}

export async function requireProjectEditor(workspaceSlug: string, projectKey: string) {
  const context = await requireProject(workspaceSlug, projectKey);
  if (!context.canEditProject) {
    forbidden();
  }
  return context;
}

export async function requireProjectById(workspaceSlug: string, projectId: string) {
  const context = await requireWorkspace(workspaceSlug);
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workspaceId: context.workspace.id,
      ...(context.isSystemAdmin ? {} : { members: { some: { userId: context.user.id } } }),
    },
  });
  if (!project) forbidden();
  const projectMembership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: project.id, userId: context.user.id } },
  });
  const projectRole = projectMembership?.role ?? null;
  return {
    ...context,
    project,
    projectMembership,
    projectRole,
    canManageProject: context.isSystemAdmin || canManageProject(projectRole),
    canEditProject: context.isSystemAdmin || canEditProjectContent(projectRole),
  };
}

export async function requireProjectAdminById(workspaceSlug: string, projectId: string) {
  const context = await requireProjectById(workspaceSlug, projectId);
  if (!context.canManageProject) {
    forbidden();
  }
  return context;
}
