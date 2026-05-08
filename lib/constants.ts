export const workspaceRoles = ["OWNER", "ADMIN", "MEMBER"] as const;
export type WorkspaceRoleValue = (typeof workspaceRoles)[number];

export const systemRoles = ["SUPER_ADMIN", "USER"] as const;
export type SystemRoleValue = (typeof systemRoles)[number];

export const projectRoles = ["LEAD", "MEMBER", "VIEWER"] as const;
export type ProjectRoleValue = (typeof projectRoles)[number];

export const issueStatuses = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CLOSED"] as const;
export type IssueStatusValue = (typeof issueStatuses)[number];

export const issuePriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type IssuePriorityValue = (typeof issuePriorities)[number];

export const statusLabels: Record<IssueStatusValue, string> = {
  TODO: "待处理",
  IN_PROGRESS: "进行中",
  REVIEW: "待评审",
  DONE: "已完成",
  CLOSED: "已关闭",
};

export const statusColumns: IssueStatusValue[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "CLOSED"];

export const issueStatusTransitions: Record<IssueStatusValue, IssueStatusValue[]> = {
  TODO: ["IN_PROGRESS", "CLOSED"],
  IN_PROGRESS: ["REVIEW", "TODO", "CLOSED"],
  REVIEW: ["DONE", "IN_PROGRESS", "CLOSED"],
  DONE: [],
  CLOSED: [],
};

export const statusTransitionLabels: Record<IssueStatusValue, string> = {
  TODO: "退回待处理",
  IN_PROGRESS: "开始处理",
  REVIEW: "提交评审",
  DONE: "评审通过",
  CLOSED: "关闭任务",
};

export function canTransitionIssueStatus(from: IssueStatusValue, to: IssueStatusValue) {
  return issueStatusTransitions[from].includes(to);
}

export const priorityLabels: Record<IssuePriorityValue, string> = {
  LOW: "低",
  MEDIUM: "中",
  HIGH: "高",
  URGENT: "紧急",
};

export const roleLabels: Record<WorkspaceRoleValue, string> = {
  OWNER: "工作区所有者",
  ADMIN: "工作区管理员",
  MEMBER: "工作区成员",
};

export const systemRoleLabels: Record<SystemRoleValue, string> = {
  SUPER_ADMIN: "系统管理员",
  USER: "普通用户",
};

export const projectRoleLabels: Record<ProjectRoleValue, string> = {
  LEAD: "项目负责人",
  MEMBER: "项目成员",
  VIEWER: "项目观察者",
};

export const userPublicFields = { id: true, name: true, email: true, systemRole: true, mustChangePassword: true, createdAt: true } as const;
