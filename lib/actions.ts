"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { WorkspaceRoleValue } from "@/lib/constants";
import {
  ForbiddenError,
  requireProject,
  requireProjectAdmin,
  requireProjectAdminById,
  requireProjectEditor,
  requireSystemAdmin,
  requireUser,
  requireWorkspaceAdmin,
} from "@/lib/permissions";
import { canChangeRole, canCreateWorkspace } from "@/lib/role-rules";
import { projectKey, slugifyAscii } from "@/lib/utils";
import {
  commentSchema,
  issueMoveSchema,
  issueSchema,
  invitationSchema,
  labelSchema,
  memberSchema,
  passwordSchema,
  projectMemberSchema,
  profileSchema,
  projectSchema,
  registerSchema,
  workspaceSchema,
  workspaceUpdateSchema,
} from "@/lib/validators";

type ActionState = {
  ok?: boolean;
  error?: string;
};

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function parseLabels(formData: FormData) {
  return formData.getAll("labelIds").map(String).filter(Boolean);
}

function actionError(error: unknown): ActionState {
  if (error instanceof ForbiddenError) return { error: error.message };
  if (error instanceof Error) return { error: error.message };
  return { error: "操作失败，请稍后重试" };
}

async function validateIssueRelations(projectId: string, workspaceId: string, assigneeId?: string, labelIds: string[] = []) {
  if (assigneeId) {
    const assignee = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: assigneeId,
        user: { memberships: { some: { workspaceId } } },
      },
    });
    if (!assignee) throw new ForbiddenError("负责人不属于该项目");
  }

  if (labelIds.length) {
    const count = await prisma.label.count({
      where: { id: { in: labelIds } },
    });
    if (count !== new Set(labelIds).size) throw new ForbiddenError("标签不存在");
  }
}

async function uniqueWorkspaceSlug(base: string) {
  const slug = slugifyAscii(base) || "workspace";
  let candidate = slug;
  let index = 2;
  while (await prisma.workspace.findUnique({ where: { slug: candidate } })) {
    candidate = `${slug}-${index}`;
    index += 1;
  }
  return candidate;
}

export async function registerAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formValue(formData, "name"),
    email: formValue(formData, "email").toLowerCase(),
    password: formValue(formData, "password"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  try {
    const passwordHash = await hash(parsed.data.password, 12);
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        systemRole: "USER",
      },
    });

    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/workspaces",
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "该邮箱已注册" };
    }
    return actionError(error);
  }
  return { ok: true };
}

export async function loginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await signIn("credentials", {
      email: formValue(formData, "email").toLowerCase(),
      password: formValue(formData, "password"),
      redirectTo: formValue(formData, "callbackUrl") || "/workspaces",
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: "邮箱或密码不正确" };
  }
  return { ok: true };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function createWorkspaceAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!canCreateWorkspace(user.systemRole)) {
    return { error: "只有系统管理员可以创建工作区" };
  }
  const name = formValue(formData, "name");
  const slugMode = formValue(formData, "slugMode");
  const rawSlug = slugifyAscii(formValue(formData, "slug"));
  const slug = slugMode === "manual" ? rawSlug : await uniqueWorkspaceSlug(rawSlug || name);
  const parsed = workspaceSchema.safeParse({
    name,
    slug,
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  try {
    await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: parsed.data.name,
          slug: parsed.data.slug,
          createdById: user.id,
        },
      });
      await tx.workspaceMember.create({
        data: { workspaceId: workspace.id, userId: user.id, role: "OWNER" },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "该工作区 slug 已存在" };
    }
    return actionError(error);
  }

  revalidatePath("/workspaces");
  redirect(`/w/${parsed.data.slug}`);
}

export async function updateWorkspaceAction(workspaceSlug: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const { workspace } = await requireWorkspaceAdmin(workspaceSlug);
  const parsed = workspaceUpdateSchema.safeParse({
    name: formValue(formData, "name"),
    slug: formValue(formData, "slug"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  try {
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { name: parsed.data.name, slug: parsed.data.slug },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "该工作区 slug 已存在" };
    }
    return actionError(error);
  }

  revalidatePath(`/w/${workspaceSlug}`);
  if (parsed.data.slug !== workspaceSlug) redirect(`/w/${parsed.data.slug}/settings/general`);
  return { ok: true };
}

export async function addMemberAction(workspaceSlug: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const { membership, workspace } = await requireWorkspaceAdmin(workspaceSlug);
  const parsed = memberSchema.safeParse({
    email: formValue(formData, "email").toLowerCase(),
    role: formValue(formData, "role") || "MEMBER",
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };
  if (!canChangeRole(membership.role, parsed.data.role)) {
    return { error: "只有所有者可以添加管理员或所有者" };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return { error: "该用户尚未注册" };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.workspaceMember.create({
        data: { workspaceId: workspace.id, userId: user.id, role: parsed.data.role },
      });
      if (parsed.data.role === "OWNER" || parsed.data.role === "ADMIN") {
        const projects = await tx.project.findMany({
          where: { workspaceId: workspace.id },
          select: { id: true },
        });
        if (projects.length) {
          await tx.projectMember.createMany({
            data: projects.map((project) => ({ projectId: project.id, userId: user.id, role: "LEAD" })),
            skipDuplicates: true,
          });
        }
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "该用户已在工作区中" };
    }
    return actionError(error);
  }
  revalidatePath(`/w/${workspaceSlug}/settings/members`);
  return { ok: true };
}

export async function createInvitationAction(workspaceSlug: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const { membership, workspace } = await requireWorkspaceAdmin(workspaceSlug);
  const parsed = invitationSchema.safeParse({
    email: formValue(formData, "email").toLowerCase(),
    role: formValue(formData, "role") || "MEMBER",
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };
  if (!canChangeRole(membership.role, parsed.data.role)) {
    return { error: "只有所有者可以邀请管理员或所有者" };
  }

  await prisma.workspaceInvitation.create({
    data: {
      workspaceId: workspace.id,
      email: parsed.data.email || null,
      role: parsed.data.role,
      token: randomBytes(24).toString("hex"),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  revalidatePath(`/w/${workspaceSlug}/settings/members`);
  return { ok: true };
}

export async function revokeInvitationAction(workspaceSlug: string, invitationId: string) {
  const { workspace } = await requireWorkspaceAdmin(workspaceSlug);
  await prisma.workspaceInvitation.deleteMany({ where: { id: invitationId, workspaceId: workspace.id, acceptedAt: null } });
  revalidatePath(`/w/${workspaceSlug}/settings/members`);
}

export async function acceptInvitationAction(token: string) {
  const user = await requireUser();
  const invitation = await prisma.workspaceInvitation.findUnique({
    where: { token },
    include: { workspace: true },
  });
  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    throw new ForbiddenError("邀请不存在或已过期");
  }
  if (invitation.email && invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
    throw new ForbiddenError("该邀请不属于当前登录账号");
  }

  await prisma.$transaction([
    prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId: user.id } },
      update: { role: invitation.role },
      create: { workspaceId: invitation.workspaceId, userId: user.id, role: invitation.role },
    }),
    prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    }),
  ]);
  redirect(`/w/${invitation.workspace.slug}`);
}

export async function updateMemberRoleAction(workspaceSlug: string, memberId: string, role: WorkspaceRoleValue) {
  const { membership, workspace } = await requireWorkspaceAdmin(workspaceSlug);
  if (!canChangeRole(membership.role, role)) throw new ForbiddenError("只有所有者可以设置该角色");
  const target = await prisma.workspaceMember.findUnique({ where: { id: memberId } });
  if (!target) return;
  if (target.role === "OWNER" && role !== "OWNER") {
    const ownerCount = await prisma.workspaceMember.count({ where: { workspaceId: workspace.id, role: "OWNER" } });
    if (ownerCount <= 1) throw new ForbiddenError("不能降级最后一个所有者");
  }
  await prisma.workspaceMember.update({ where: { id: memberId }, data: { role } });
  revalidatePath(`/w/${workspaceSlug}/settings/members`);
}

export async function removeMemberAction(workspaceSlug: string, memberId: string) {
  const { membership, workspace } = await requireWorkspaceAdmin(workspaceSlug);
  const target = await prisma.workspaceMember.findUnique({ where: { id: memberId } });
  if (!target) return;
  if (target.role === "OWNER" && membership.role !== "OWNER") {
    throw new ForbiddenError("只有所有者可以移除所有者");
  }
  if (target.role === "OWNER") {
    const ownerCount = await prisma.workspaceMember.count({ where: { workspaceId: workspace.id, role: "OWNER" } });
    if (ownerCount <= 1) throw new ForbiddenError("不能移除最后一个所有者");
  }
  await prisma.workspaceMember.delete({ where: { id: memberId } });
  revalidatePath(`/w/${workspaceSlug}/settings/members`);
}

export async function createProjectAction(workspaceSlug: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const { user, workspace } = await requireWorkspaceAdmin(workspaceSlug);
  const parsed = projectSchema.safeParse({
    name: formValue(formData, "name"),
    key: formValue(formData, "key") || projectKey(formValue(formData, "name")),
    description: formValue(formData, "description"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  try {
    await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: parsed.data.name,
        key: parsed.data.key,
        description: parsed.data.description || null,
        members: {
          create: { userId: user.id, role: "LEAD" },
        },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "该项目 key 已存在" };
    }
    return actionError(error);
  }
  revalidatePath(`/w/${workspaceSlug}/projects`);
  return { ok: true };
}

export async function archiveProjectAction(workspaceSlug: string, projectKeyValue: string) {
  const { project } = await requireProjectAdmin(workspaceSlug, projectKeyValue);
  await prisma.project.update({ where: { id: project.id }, data: { archived: true } });
  revalidatePath(`/w/${workspaceSlug}/projects`);
}

export async function restoreProjectAction(workspaceSlug: string, projectId: string) {
  const { project } = await requireProjectAdminById(workspaceSlug, projectId);
  await prisma.project.update({ where: { id: project.id }, data: { archived: false } });
  revalidatePath(`/w/${workspaceSlug}/projects`);
  revalidatePath(`/w/${workspaceSlug}/projects/archived`);
}

export async function deleteProjectAction(workspaceSlug: string, projectId: string) {
  const { project } = await requireProjectAdminById(workspaceSlug, projectId);
  await prisma.project.deleteMany({ where: { id: project.id, archived: true } });
  revalidatePath(`/w/${workspaceSlug}/projects/archived`);
}

export async function updateProjectAction(workspaceSlug: string, projectId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const { project } = await requireProjectAdminById(workspaceSlug, projectId);
  const parsed = projectSchema.safeParse({
    name: formValue(formData, "name"),
    key: formValue(formData, "key") || projectKey(formValue(formData, "name")),
    description: formValue(formData, "description"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  try {
    await prisma.project.update({
      where: { id: project.id },
      data: {
        name: parsed.data.name,
        key: parsed.data.key,
        description: parsed.data.description || null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "该项目 key 已存在" };
    }
    return actionError(error);
  }
  revalidatePath(`/w/${workspaceSlug}/projects`);
  revalidatePath(`/w/${workspaceSlug}/projects/${parsed.data.key}`);
  return { ok: true };
}

export async function createIssueAction(workspaceSlug: string, projectKeyValue: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const { user, workspace, project } = await requireProjectEditor(workspaceSlug, projectKeyValue);
  const parsed = issueSchema.safeParse({
    title: formValue(formData, "title"),
    description: formValue(formData, "description"),
    status: formValue(formData, "status") || "TODO",
    priority: formValue(formData, "priority") || "MEDIUM",
    assigneeId: formValue(formData, "assigneeId"),
    dueDate: formValue(formData, "dueDate"),
    labelIds: parseLabels(formData),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  try {
    await validateIssueRelations(project.id, workspace.id, parsed.data.assigneeId, parsed.data.labelIds);
  } catch (error) {
    return actionError(error);
  }

  const maxSort = await prisma.issue.aggregate({
    where: { projectId: project.id, status: parsed.data.status },
    _max: { sortOrder: true },
  });

  await prisma.$transaction(async (tx) => {
    const currentProject = await tx.project.update({
      where: { id: project.id },
      data: { nextIssueNumber: { increment: 1 } },
      select: { nextIssueNumber: true },
    });
    const number = currentProject.nextIssueNumber - 1;
    const issue = await tx.issue.create({
      data: {
        projectId: project.id,
        number,
        creatorId: user.id,
        title: parsed.data.title,
        description: parsed.data.description || null,
        status: parsed.data.status,
        priority: parsed.data.priority,
        assigneeId: parsed.data.assigneeId || null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1000,
        labels: parsed.data.labelIds?.length
          ? { create: parsed.data.labelIds.map((labelId) => ({ labelId })) }
          : undefined,
      },
    });
    await tx.issueActivity.create({
      data: { issueId: issue.id, actorId: user.id, action: "创建任务", detail: `${project.key}-${number}` },
    });
  });

  revalidatePath("/admin/labels");
  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}`);
  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}/board`);
  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}/issues`);
  return { ok: true };
}

export async function updateIssueAction(workspaceSlug: string, projectKeyValue: string, issueId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const { user, workspace, project } = await requireProjectEditor(workspaceSlug, projectKeyValue);
  const parsed = issueSchema.safeParse({
    title: formValue(formData, "title"),
    description: formValue(formData, "description"),
    status: formValue(formData, "status"),
    priority: formValue(formData, "priority"),
    assigneeId: formValue(formData, "assigneeId"),
    dueDate: formValue(formData, "dueDate"),
    labelIds: parseLabels(formData),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  try {
    await validateIssueRelations(project.id, workspace.id, parsed.data.assigneeId, parsed.data.labelIds);
  } catch (error) {
    return actionError(error);
  }

  const issue = await prisma.issue.findFirst({ where: { id: issueId, projectId: project.id } });
  if (!issue) return { error: "任务不存在" };

  const operations: Prisma.PrismaPromise<unknown>[] = [
    prisma.issue.update({
      where: { id: issueId },
      data: {
        title: parsed.data.title,
        description: parsed.data.description || null,
        status: parsed.data.status,
        priority: parsed.data.priority,
        assigneeId: parsed.data.assigneeId || null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      },
    }),
    prisma.issueLabel.deleteMany({ where: { issueId } }),
  ];
  if (parsed.data.labelIds?.length) {
    operations.push(
      prisma.issueLabel.createMany({
        data: parsed.data.labelIds.map((labelId) => ({ issueId, labelId })),
        skipDuplicates: true,
      }),
    );
  }
  operations.push(
    prisma.issueActivity.create({
      data: { issueId, actorId: user.id, action: "更新任务", detail: parsed.data.title },
    }),
  );
  await prisma.$transaction(operations);
  revalidatePath("/admin/labels");
  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}`);
  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}/board`);
  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}/issues`);
  return { ok: true };
}

export async function deleteIssueAction(workspaceSlug: string, projectKeyValue: string, issueId: string) {
  const { project } = await requireProjectEditor(workspaceSlug, projectKeyValue);
  await prisma.issue.deleteMany({ where: { id: issueId, projectId: project.id } });
  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}`);
  redirect(`/w/${workspaceSlug}/projects/${projectKeyValue}/issues`);
}

export async function moveIssue(input: unknown) {
  const parsed = issueMoveSchema.parse(input);
  const issue = await prisma.issue.findUnique({
    where: { id: parsed.issueId },
    include: { project: { include: { workspace: true } } },
  });
  if (!issue) throw new Error("任务不存在");
  const { user } = await requireProjectEditor(issue.project.workspace.slug, issue.project.key);

  let sortOrder = Date.now();
  if (parsed.overIssueId) {
    const overIssue = await prisma.issue.findFirst({
      where: { id: parsed.overIssueId, projectId: issue.projectId },
    });
    if (overIssue) sortOrder = overIssue.sortOrder - 1;
  }

  await prisma.$transaction([
    prisma.issue.update({
      where: { id: parsed.issueId },
      data: { status: parsed.status, sortOrder },
    }),
    prisma.issueActivity.create({
      data: { issueId: parsed.issueId, actorId: user.id, action: "移动任务", detail: parsed.status },
    }),
  ]);
  revalidatePath(`/w/${issue.project.workspace.slug}/projects/${issue.project.key}`);
}

export async function createCommentAction(workspaceSlug: string, projectKeyValue: string, issueId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const { user, project } = await requireProjectEditor(workspaceSlug, projectKeyValue);
  const parsed = commentSchema.safeParse({ body: formValue(formData, "body") });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };
  const issue = await prisma.issue.findFirst({ where: { id: issueId, projectId: project.id } });
  if (!issue) return { error: "任务不存在" };
  await prisma.$transaction([
    prisma.issueComment.create({
      data: { issueId, authorId: user.id, body: parsed.data.body },
    }),
    prisma.issueActivity.create({
      data: { issueId, actorId: user.id, action: "添加评论" },
    }),
  ]);
  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}/issues/${issueId}`);
  return { ok: true };
}

export async function deleteCommentAction(workspaceSlug: string, projectKeyValue: string, commentId: string) {
  const { user, project } = await requireProject(workspaceSlug, projectKeyValue);
  const comment = await prisma.issueComment.findFirst({
    where: { id: commentId, issue: { projectId: project.id } },
  });
  if (!comment) return;
  if (comment.authorId !== user.id) throw new ForbiddenError("只能删除自己的评论");
  await prisma.issueComment.delete({ where: { id: commentId } });
  revalidatePath("/admin/labels");
  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}`);
  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}/board`);
  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}/issues`);
}

export async function updateCommentAction(workspaceSlug: string, projectKeyValue: string, commentId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const { user, project } = await requireProjectEditor(workspaceSlug, projectKeyValue);
  const parsed = commentSchema.safeParse({ body: formValue(formData, "body") });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };
  const comment = await prisma.issueComment.findFirst({
    where: { id: commentId, issue: { projectId: project.id } },
  });
  if (!comment) return { error: "评论不存在" };
  if (comment.authorId !== user.id) return { error: "只能编辑自己的评论" };

  await prisma.issueComment.update({
    where: { id: commentId },
    data: { body: parsed.data.body },
  });
  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}`);
  return { ok: true };
}

export async function createLabelAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireSystemAdmin();
  const parsed = labelSchema.safeParse({
    name: formValue(formData, "name"),
    color: formValue(formData, "color"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };
  try {
    await prisma.label.create({
      data: { name: parsed.data.name, color: parsed.data.color },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "标签已存在" };
    }
    return actionError(error);
  }
  revalidatePath("/admin/labels");
  revalidatePath("/w/[workspaceSlug]/projects/[projectKey]/board", "page");
  revalidatePath("/w/[workspaceSlug]/projects/[projectKey]/issues", "page");
  revalidatePath("/w/[workspaceSlug]/projects/[projectKey]/issues/[issueId]", "page");
  return { ok: true };
}

export async function updateLabelAction(labelId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  await requireSystemAdmin();
  const parsed = labelSchema.safeParse({
    name: formValue(formData, "name"),
    color: formValue(formData, "color"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };
  try {
    await prisma.label.update({
      where: { id: labelId },
      data: { name: parsed.data.name, color: parsed.data.color },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "标签已存在" };
    }
    return actionError(error);
  }
  revalidatePath("/admin/labels");
  revalidatePath("/w/[workspaceSlug]/projects/[projectKey]/board", "page");
  revalidatePath("/w/[workspaceSlug]/projects/[projectKey]/issues", "page");
  revalidatePath("/w/[workspaceSlug]/projects/[projectKey]/issues/[issueId]", "page");
  return { ok: true };
}

export async function deleteLabelAction(labelId: string) {
  await requireSystemAdmin();
  await prisma.label.deleteMany({ where: { id: labelId } });
  revalidatePath("/admin/labels");
  revalidatePath("/w/[workspaceSlug]/projects/[projectKey]/board", "page");
  revalidatePath("/w/[workspaceSlug]/projects/[projectKey]/issues", "page");
  revalidatePath("/w/[workspaceSlug]/projects/[projectKey]/issues/[issueId]", "page");
}

export async function addProjectMemberAction(workspaceSlug: string, projectKeyValue: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const { workspace, project } = await requireProjectAdmin(workspaceSlug, projectKeyValue);
  const parsed = projectMemberSchema.safeParse({
    email: formValue(formData, "email").toLowerCase(),
    role: formValue(formData, "role") || "MEMBER",
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId: workspace.id, user: { email: parsed.data.email } },
    include: { user: true },
  });
  if (!member) return { error: "该用户尚未加入工作区" };

  try {
    await prisma.projectMember.create({
      data: { projectId: project.id, userId: member.userId, role: parsed.data.role },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "该用户已在项目中" };
    }
    return actionError(error);
  }

  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}`);
  return { ok: true };
}

export async function updateProjectMemberRoleAction(workspaceSlug: string, projectKeyValue: string, projectMemberId: string, role: string) {
  const { project } = await requireProjectAdmin(workspaceSlug, projectKeyValue);
  const parsed = projectMemberSchema.pick({ role: true }).safeParse({ role });
  if (!parsed.success) throw new ForbiddenError(parsed.error.errors[0]?.message);
  await prisma.projectMember.update({
    where: { id: projectMemberId, projectId: project.id },
    data: { role: parsed.data.role },
  });
  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}`);
}

export async function removeProjectMemberAction(workspaceSlug: string, projectKeyValue: string, projectMemberId: string) {
  const { project } = await requireProjectAdmin(workspaceSlug, projectKeyValue);
  const target = await prisma.projectMember.findUnique({ where: { id: projectMemberId } });
  if (!target || target.projectId !== project.id) return;
  if (target.role === "LEAD") {
    const leadCount = await prisma.projectMember.count({ where: { projectId: project.id, role: "LEAD" } });
    if (leadCount <= 1) throw new ForbiddenError("不能移除最后一个项目负责人");
  }
  await prisma.projectMember.delete({ where: { id: projectMemberId } });
  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}`);
}

export async function updateProfileAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    name: formValue(formData, "name"),
    email: formValue(formData, "email").toLowerCase(),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name, email: parsed.data.email },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "该邮箱已被使用" };
    }
    return actionError(error);
  }
  revalidatePath("/settings/profile");
  return { ok: true };
}

export async function updatePasswordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = passwordSchema.safeParse({
    currentPassword: formValue(formData, "currentPassword"),
    newPassword: formValue(formData, "newPassword"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "用户不存在" };
  const valid = await compare(parsed.data.currentPassword, dbUser.passwordHash);
  if (!valid) return { error: "当前密码不正确" };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hash(parsed.data.newPassword, 12), mustChangePassword: false },
  });
  return { ok: true };
}

export async function forceChangePasswordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const result = await updatePasswordAction(_state, formData);
  if (result.error) return result;
  redirect("/workspaces");
}
