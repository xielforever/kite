export const workspaceRoles = ["OWNER", "ADMIN", "MEMBER"] as const;
export type WorkspaceRoleValue = (typeof workspaceRoles)[number];

export const systemRoles = ["SUPER_ADMIN", "USER"] as const;
export type SystemRoleValue = (typeof systemRoles)[number];

export const projectRoles = ["LEAD", "MEMBER", "VIEWER"] as const;
export type ProjectRoleValue = (typeof projectRoles)[number];

export const issueStatuses = ["TODO", "IN_PROGRESS", "DONE"] as const;
export type IssueStatusValue = (typeof issueStatuses)[number];

export const issuePriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type IssuePriorityValue = (typeof issuePriorities)[number];

export const statusLabels: Record<IssueStatusValue, string> = {
  TODO: "待处理",
  IN_PROGRESS: "进行中",
  DONE: "已完成",
};

export const statusColumns: IssueStatusValue[] = ["TODO", "IN_PROGRESS", "DONE"];

export const priorityLabels: Record<IssuePriorityValue, string> = {
  LOW: "低",
  MEDIUM: "中",
  HIGH: "高",
  URGENT: "紧急",
};

export const roleLabels: Record<WorkspaceRoleValue, string> = {
  OWNER: "所有者",
  ADMIN: "管理员",
  MEMBER: "成员",
};

export const systemRoleLabels: Record<SystemRoleValue, string> = {
  SUPER_ADMIN: "系统管理员",
  USER: "普通用户",
};

export const projectRoleLabels: Record<ProjectRoleValue, string> = {
  LEAD: "负责人",
  MEMBER: "成员",
  VIEWER: "只读",
};
