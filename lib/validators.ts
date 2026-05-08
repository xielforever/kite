import { z } from "zod";
import { issuePriorities, issueStatuses, projectRoles, systemRoles } from "@/lib/constants";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "请输入姓名").max(80, "姓名过长"),
  email: z.string().trim().email("邮箱格式不正确").max(160),
  password: z.string().min(8, "密码至少 8 位").max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().email("邮箱格式不正确"),
  password: z.string().min(1, "请输入密码"),
});

export const profileSchema = z.object({
  name: z.string().trim().min(1, "请输入姓名").max(80, "姓名过长"),
  email: z.string().trim().email("邮箱格式不正确").max(160),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(1, "请输入当前密码"),
  newPassword: z.string().min(8, "新密码至少 8 位").max(128),
});

export const workspaceSchema = z.object({
  name: z.string().trim().min(1, "请输入工作区名称").max(80),
  slug: z
    .string()
    .trim()
    .min(2, "slug 至少 2 位")
    .max(48)
    .regex(/^[a-z0-9-]+$/, "slug 只能包含小写字母、数字和连字符"),
  description: z.string().trim().max(600).optional().or(z.literal("")),
});

export const workspaceUpdateSchema = workspaceSchema;

export const projectSchema = z.object({
  name: z.string().trim().min(1, "请输入项目名称").max(100),
  key: z
    .string()
    .trim()
    .min(2, "项目 key 至少 2 位")
    .max(8)
    .regex(/^[A-Z0-9]+$/, "项目 key 只能包含大写字母和数字"),
  description: z.string().trim().max(600).optional().or(z.literal("")),
  defaultDueDays: z.coerce.number().int().min(1).max(365).optional().or(z.literal("")),
});

export const projectCreateSchema = projectSchema.extend({
  leadEmail: z.string().trim().email("项目负责人邮箱格式不正确"),
});

export const projectMemberSchema = z.object({
  email: z.string().trim().email("邮箱格式不正确"),
  role: z.enum(projectRoles),
});

export const issueSchema = z.object({
  title: z.string().trim().min(1, "请输入任务标题").max(180),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  status: z.enum(issueStatuses),
  priority: z.enum(issuePriorities),
  assigneeId: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
});

export const issueMoveSchema = z.object({
  issueId: z.string().min(1),
  status: z.enum(issueStatuses),
  overIssueId: z.string().optional(),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1, "请输入评论").max(3000),
});

export const adminUserRoleSchema = z.object({
  userId: z.string().min(1),
  systemRole: z.enum(systemRoles),
});

export const adminResetPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(8, "新密码至少 8 位").max(128),
});
