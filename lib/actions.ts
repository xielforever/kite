"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { compare, hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { IssuePriorityValue, IssueStatusValue } from "@/lib/constants";
import { canTransitionIssueStatus, priorityLabels, statusLabels } from "@/lib/constants";
import {
  ForbiddenError,
  requireProject,
  requireProjectAdmin,
  requireProjectAdminById,
  requireProjectEditor,
  requireSystemAdmin,
  requireUser,
} from "@/lib/permissions";
import { canCreateWorkspace } from "@/lib/role-rules";
import { publicRegistrationEnabled } from "@/lib/registration";
import { projectKey, slugifyAscii } from "@/lib/utils";
import {
  adminResetPasswordSchema,
  adminCreateUserSchema,
  adminUserRoleSchema,
  commentSchema,
  issueMoveSchema,
  issueSchema,
  passwordSchema,
  projectCreateSchema,
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

function actionError(error: unknown): ActionState {
  if (error instanceof ForbiddenError) return { error: error.message };
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.length > 200) return { error: "操作失败，请稍后重试" };
    if (/prisma|Prisma|database|connection|ECONNREFUSED|ETIMEDOUT|sequelize|knex|drizzle/i.test(msg)) return { error: "操作失败，请稍后重试" };
    return { error: msg };
  }
  return { error: "操作失败，请稍后重试" };
}

async function validateIssueRelations(projectId: string, assigneeId?: string) {
  if (assigneeId) {
    const assignee = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: assigneeId,
      },
    });
    if (!assignee) throw new ForbiddenError("负责人不属于该项目");
  }
}

function nullableValue(value?: string | null) {
  return value?.trim() ? value.trim() : null;
}

function dateKey(value?: Date | string | null) {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

function formatDateValue(value?: Date | string | null) {
  return dateKey(value) ?? "未设置";
}

function formatTextValue(value?: string | null) {
  return value?.trim() ? value.trim() : "未设置";
}

function descriptionChangeLabel(before?: string | null, after?: string | null) {
  const beforeSet = Boolean(before?.trim());
  const afterSet = Boolean(after?.trim());
  if (!beforeSet && afterSet) return "描述：未设置 → 已填写";
  if (beforeSet && !afterSet) return "描述：已清空";
  return "描述：已更新";
}

function buildIssueChangeDetails({
  issue,
  next,
  assigneeLabels,
}: {
  issue: {
    title: string;
    description: string | null;
    priority: IssuePriorityValue;
    assigneeId: string | null;
    dueDate: Date | null;
  };
  next: {
    title: string;
    description: string | null;
    priority: IssuePriorityValue;
    assigneeId: string | null;
    dueDate: Date | null;
  };
  assigneeLabels: Map<string, string>;
}) {
  const changes: string[] = [];
  if (issue.title !== next.title) changes.push(`标题：${formatTextValue(issue.title)} → ${formatTextValue(next.title)}`);
  if ((issue.description ?? "") !== (next.description ?? "")) changes.push(descriptionChangeLabel(issue.description, next.description));
  if (issue.priority !== next.priority) changes.push(`优先级：${priorityLabels[issue.priority]} → ${priorityLabels[next.priority]}`);
  if ((issue.assigneeId ?? "") !== (next.assigneeId ?? "")) {
    const before = issue.assigneeId ? (assigneeLabels.get(issue.assigneeId) ?? issue.assigneeId) : "未分配";
    const after = next.assigneeId ? (assigneeLabels.get(next.assigneeId) ?? next.assigneeId) : "未分配";
    changes.push(`负责人：${before} → ${after}`);
  }
  if (dateKey(issue.dueDate) !== dateKey(next.dueDate)) changes.push(`截止日期：${formatDateValue(issue.dueDate)} → ${formatDateValue(next.dueDate)}`);
  return changes;
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
  if (!publicRegistrationEnabled()) return { error: "当前部署已关闭公开注册，请联系系统管理员创建账号" };

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

function safeRedirectUrl(url: string): string {
  if (url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\")) return url;
  return "/workspaces";
}

export async function loginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const callbackUrl = formValue(formData, "callbackUrl");
    await signIn("credentials", {
      email: formValue(formData, "email").toLowerCase(),
      password: formValue(formData, "password"),
      redirectTo: callbackUrl ? safeRedirectUrl(callbackUrl) : "/workspaces",
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
    description: formValue(formData, "description"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  try {
    await prisma.workspace.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description || null,
        createdById: user.id,
      },
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
  await requireSystemAdmin();
  const workspace = await prisma.workspace.findUnique({ where: { slug: workspaceSlug } });
  if (!workspace) return { error: "工作区不存在" };
  const parsed = workspaceUpdateSchema.safeParse({
    name: formValue(formData, "name"),
    slug: formValue(formData, "slug"),
    description: formValue(formData, "description"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  try {
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { name: parsed.data.name, slug: parsed.data.slug, description: parsed.data.description || null },
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

export async function createProjectAction(workspaceSlug: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  await requireSystemAdmin();
  const workspace = await prisma.workspace.findUnique({ where: { slug: workspaceSlug } });
  if (!workspace) return { error: "工作区不存在" };
  const parsed = projectCreateSchema.safeParse({
    name: formValue(formData, "name"),
    key: formValue(formData, "key") || projectKey(formValue(formData, "name")),
    description: formValue(formData, "description"),
    defaultDueDays: formValue(formData, "defaultDueDays"),
    leadEmail: formValue(formData, "leadEmail").toLowerCase(),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  try {
    const lead = await prisma.user.findUnique({
      where: { email: parsed.data.leadEmail },
      select: { id: true },
    });
    if (!lead) return { error: "项目负责人尚未注册" };

    await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: parsed.data.name,
        key: parsed.data.key,
        description: parsed.data.description || null,
        defaultDueDays: parsed.data.defaultDueDays ? Number(parsed.data.defaultDueDays) : null,
        members: {
          create: { userId: lead.id, role: "LEAD" },
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
  if (project.archived) return;
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
    key: project.key,
    description: formValue(formData, "description"),
    defaultDueDays: formValue(formData, "defaultDueDays"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  try {
    await prisma.project.update({
      where: { id: project.id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        defaultDueDays: parsed.data.defaultDueDays ? Number(parsed.data.defaultDueDays) : null,
      },
    });
  } catch (error) {
    return actionError(error);
  }
  revalidatePath(`/w/${workspaceSlug}/projects`);
  revalidatePath(`/w/${workspaceSlug}/projects/${project.key}`);
  return { ok: true };
}

export async function createIssueAction(workspaceSlug: string, projectKeyValue: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const { user, project } = await requireProjectEditor(workspaceSlug, projectKeyValue);
  const parsed = issueSchema.safeParse({
    title: formValue(formData, "title"),
    description: formValue(formData, "description"),
    status: formValue(formData, "status") || "TODO",
    priority: formValue(formData, "priority") || "MEDIUM",
    assigneeId: formValue(formData, "assigneeId"),
    dueDate: formValue(formData, "dueDate"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  try {
    await validateIssueRelations(project.id, parsed.data.assigneeId);
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
        dueDate: parsed.data.dueDate
          ? new Date(parsed.data.dueDate)
          : project.defaultDueDays
            ? new Date(Date.now() + project.defaultDueDays * 24 * 60 * 60 * 1000)
            : null,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1000,
      },
    });
    await tx.issueActivity.create({
      data: { issueId: issue.id, actorId: user.id, action: "创建任务", detail: `${project.key}-${number}` },
    });
  });

  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}`);
  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}/board`);
  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}/issues`);
  return { ok: true };
}

export async function updateIssueAction(workspaceSlug: string, projectKeyValue: string, issueId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const { user, project } = await requireProjectEditor(workspaceSlug, projectKeyValue);
  const parsed = issueSchema.omit({ status: true }).safeParse({
    title: formValue(formData, "title"),
    description: formValue(formData, "description"),
    priority: formValue(formData, "priority"),
    assigneeId: formValue(formData, "assigneeId"),
    dueDate: formValue(formData, "dueDate"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  try {
    await validateIssueRelations(project.id, parsed.data.assigneeId);
  } catch (error) {
    return actionError(error);
  }

  const issue = await prisma.issue.findFirst({ where: { id: issueId, projectId: project.id } });
  if (!issue) return { error: "任务不存在" };

  const nextIssue = {
    title: parsed.data.title,
    description: nullableValue(parsed.data.description),
    priority: parsed.data.priority,
    assigneeId: nullableValue(parsed.data.assigneeId),
    dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
  };
  const assigneeIds = Array.from(new Set([issue.assigneeId, nextIssue.assigneeId].filter(Boolean))) as string[];
  const assignees = assigneeIds.length
    ? await prisma.user.findMany({
        where: { id: { in: assigneeIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const assigneeLabels = new Map(assignees.map((assignee) => [assignee.id, assignee.name || assignee.email]));
  const changes = buildIssueChangeDetails({ issue, next: nextIssue, assigneeLabels });
  if (!changes.length) return { ok: true };

  await prisma.$transaction([
    prisma.issue.update({
      where: { id: issueId },
      data: {
        title: nextIssue.title,
        description: nextIssue.description,
        priority: nextIssue.priority,
        assigneeId: nextIssue.assigneeId,
        dueDate: nextIssue.dueDate,
      },
    }),
    prisma.issueActivity.create({
      data: { issueId, actorId: user.id, action: "更新任务字段", detail: changes.join("\n") },
    }),
  ]);
  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}`);
  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}/board`);
  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}/issues`);
  return { ok: true };
}

export async function updateIssueStatusAction(workspaceSlug: string, projectKeyValue: string, issueId: string, status: IssueStatusValue) {
  const { user, project } = await requireProjectEditor(workspaceSlug, projectKeyValue);
  const parsed = issueMoveSchema.pick({ status: true }).safeParse({ status });
  if (!parsed.success) throw new ForbiddenError("状态不正确");

  const issue = await prisma.issue.findFirst({
    where: { id: issueId, projectId: project.id },
    select: { id: true, status: true },
  });
  if (!issue) throw new ForbiddenError("任务不存在");
  if (issue.status === parsed.data.status) return;
  if (!canTransitionIssueStatus(issue.status, parsed.data.status)) {
    throw new ForbiddenError(`不能从${statusLabels[issue.status]}直接流转到${statusLabels[parsed.data.status]}`);
  }

  const action =
    parsed.data.status === "DONE"
      ? "完成任务"
      : parsed.data.status === "CLOSED"
        ? "关闭任务"
        : parsed.data.status === "REVIEW"
          ? "提交评审"
          : "移动任务";

  await prisma.$transaction([
    prisma.issue.update({
      where: { id: issueId },
      data: { status: parsed.data.status },
    }),
    prisma.issueActivity.create({
      data: {
        issueId,
        actorId: user.id,
        action,
        detail: `${statusLabels[issue.status]} → ${statusLabels[parsed.data.status]}`,
      },
    }),
  ]);

  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}`);
  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}/board`);
  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}/issues`);
  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}/issues/${issueId}`);
}

export async function deleteIssueAction(workspaceSlug: string, projectKeyValue: string, issueId: string) {
  const { project } = await requireProjectEditor(workspaceSlug, projectKeyValue);
  await prisma.issue.deleteMany({ where: { id: issueId, projectId: project.id } });
  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}`);
  redirect(`/w/${workspaceSlug}/projects/${projectKeyValue}/issues`);
}

export async function moveIssue(input: unknown) {
  const parsed = issueMoveSchema.safeParse(input);
  if (!parsed.success) throw new Error("参数验证失败");
  const { issueId, overIssueId, status } = parsed.data;
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: { project: { include: { workspace: true } } },
  });
  if (!issue) throw new Error("任务不存在");
  const { user } = await requireProjectEditor(issue.project.workspace.slug, issue.project.key);
  if (issue.status !== status && !canTransitionIssueStatus(issue.status, status)) {
    throw new Error(`不能从${statusLabels[issue.status]}直接流转到${statusLabels[status]}`);
  }

  let sortOrder = Date.now();
  if (overIssueId) {
    const overIssue = await prisma.issue.findFirst({
      where: { id: overIssueId, projectId: issue.projectId },
    });
    if (overIssue) sortOrder = overIssue.sortOrder - 1;
  }

  const statusChanged = issue.status !== status;

  await prisma.$transaction([
    prisma.issue.update({
      where: { id: issueId },
      data: { status, sortOrder },
    }),
    prisma.issueActivity.create({
      data: {
        issueId,
        actorId: user.id,
        action: statusChanged ? "移动任务" : "调整排序",
        detail: statusChanged ? `${statusLabels[issue.status]} → ${statusLabels[status]}` : `${statusLabels[status]}内排序调整`,
      },
    }),
  ]);
  revalidatePath(`/w/${issue.project.workspace.slug}/projects/${issue.project.key}`);
  revalidatePath(`/w/${issue.project.workspace.slug}/projects/${issue.project.key}/board`);
  revalidatePath(`/w/${issue.project.workspace.slug}/projects/${issue.project.key}/issues`);
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

export async function deleteCommentAction(workspaceSlug: string, projectKeyValue: string, issueId: string, commentId: string) {
  const { user, project } = await requireProject(workspaceSlug, projectKeyValue);
  const comment = await prisma.issueComment.findFirst({
    where: { id: commentId, issue: { projectId: project.id } },
  });
  if (!comment) return;
  if (comment.authorId !== user.id) throw new ForbiddenError("只能删除自己的评论");
  await prisma.issueComment.delete({ where: { id: commentId } });
  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}/issues/${issueId}`);
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
  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}/issues/${comment.issueId}`);
  return { ok: true };
}

export async function addProjectMemberAction(workspaceSlug: string, projectKeyValue: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const { project } = await requireProjectAdmin(workspaceSlug, projectKeyValue);
  const parsed = projectMemberSchema.safeParse({
    email: formValue(formData, "email").toLowerCase(),
    role: formValue(formData, "role") || "MEMBER",
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (!user) return { error: "该用户尚未注册" };

  try {
    await prisma.projectMember.create({
      data: { projectId: project.id, userId: user.id, role: parsed.data.role },
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
  const target = await prisma.projectMember.findUnique({ where: { id: projectMemberId } });
  if (!target || target.projectId !== project.id) return;
  if (target.role === "LEAD" && parsed.data.role !== "LEAD") {
    const leadCount = await prisma.projectMember.count({ where: { projectId: project.id, role: "LEAD" } });
    if (leadCount <= 1) throw new ForbiddenError("不能移除最后一个项目负责人");
  }
  await prisma.projectMember.update({
    where: { id: projectMemberId },
    data: { role: parsed.data.role },
  });
  revalidatePath(`/w/${workspaceSlug}/projects/${projectKeyValue}`);
}

export async function updateProjectMemberRoleFormAction(workspaceSlug: string, projectKeyValue: string, projectMemberId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const role = String(formData.get("role") ?? "");
  try {
    await updateProjectMemberRoleAction(workspaceSlug, projectKeyValue, projectMemberId, role);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
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

export async function removeProjectMemberFormAction(workspaceSlug: string, projectKeyValue: string, projectMemberId: string, _state: ActionState, _formData: FormData): Promise<ActionState> {
  void _state;
  void _formData;
  try {
    await removeProjectMemberAction(workspaceSlug, projectKeyValue, projectMemberId);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
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

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!dbUser) return { error: "用户不存在" };
  const valid = await compare(parsed.data.currentPassword, dbUser.passwordHash);
  if (!valid) return { error: "当前密码不正确" };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hash(parsed.data.newPassword, 12), mustChangePassword: false },
  });
  revalidatePath("/setup/change-password");
  revalidatePath("/settings/profile");
  revalidatePath("/");
  return { ok: true };
}

export async function forceChangePasswordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const result = await updatePasswordAction(_state, formData);
  if (result.error) return result;
  redirect("/workspaces");
}

export async function adminCreateUserAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireSystemAdmin();
  const parsed = adminCreateUserSchema.safeParse({
    name: formValue(formData, "name"),
    email: formValue(formData, "email").toLowerCase(),
    password: formValue(formData, "password"),
    systemRole: formValue(formData, "systemRole") || "USER",
    mustChangePassword: formData.get("mustChangePassword") === "on",
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };

  try {
    const passwordHash = await hash(parsed.data.password, 12);
    const created = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        systemRole: parsed.data.systemRole,
        mustChangePassword: parsed.data.mustChangePassword,
      },
      select: { id: true },
    });
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "ADMIN_CREATE_USER",
        targetId: created.id,
        detail: parsed.data.systemRole,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "该邮箱已注册" };
    }
    return actionError(error);
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function adminUpdateUserRoleAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireSystemAdmin();
  const parsed = adminUserRoleSchema.safeParse({
    userId: formValue(formData, "userId"),
    systemRole: formValue(formData, "systemRole"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };
  if (parsed.data.userId === admin.id) return { error: "不能修改自己的系统角色" };
  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true, systemRole: true } });
  if (!target) return { error: "用户不存在" };
  const superAdminCount = await prisma.user.count({ where: { systemRole: "SUPER_ADMIN" } });
  if (target.systemRole === "SUPER_ADMIN" && parsed.data.systemRole !== "SUPER_ADMIN" && superAdminCount <= 1) {
    return { error: "系统至少需要一位超级管理员" };
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: parsed.data.userId }, data: { systemRole: parsed.data.systemRole } }),
    prisma.auditLog.create({ data: { actorId: admin.id, action: "ADMIN_UPDATE_ROLE", targetId: parsed.data.userId, detail: `${target.systemRole} → ${parsed.data.systemRole}` } }),
  ]);
  revalidatePath("/admin");
  return { ok: true };
}

export async function adminResetPasswordAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const adminUser = await requireSystemAdmin();
  const parsed = adminResetPasswordSchema.safeParse({
    userId: formValue(formData, "userId"),
    newPassword: formValue(formData, "newPassword"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message };
  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true } });
  if (!target) return { error: "用户不存在" };
  const hashed = await hash(parsed.data.newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: parsed.data.userId }, data: { passwordHash: hashed, mustChangePassword: true } }),
    prisma.auditLog.create({ data: { actorId: adminUser.id, action: "ADMIN_RESET_PASSWORD", targetId: parsed.data.userId } }),
  ]);
  revalidatePath("/admin");
  return { ok: true };
}
