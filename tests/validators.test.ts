import { describe, expect, it } from "vitest";
import {
  registerSchema,
  loginSchema,
  profileSchema,
  passwordSchema,
  workspaceSchema,
  memberSchema,
  invitationSchema,
  projectSchema,
  projectMemberSchema,
  issueSchema,
  issueMoveSchema,
  commentSchema,
} from "@/lib/validators";

describe("registerSchema", () => {
  it("accepts valid registration", () => {
    expect(registerSchema.safeParse({ name: "张三", email: "test@example.com", password: "12345678" }).success).toBe(true);
  });
  it("rejects short password", () => {
    expect(registerSchema.safeParse({ name: "张三", email: "test@example.com", password: "123" }).success).toBe(false);
  });
  it("rejects invalid email", () => {
    expect(registerSchema.safeParse({ name: "张三", email: "not-email", password: "12345678" }).success).toBe(false);
  });
  it("rejects empty name", () => {
    expect(registerSchema.safeParse({ name: "", email: "test@example.com", password: "12345678" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid login", () => {
    expect(loginSchema.safeParse({ email: "test@example.com", password: "any" }).success).toBe(true);
  });
  it("rejects empty password", () => {
    expect(loginSchema.safeParse({ email: "test@example.com", password: "" }).success).toBe(false);
  });
});

describe("profileSchema", () => {
  it("accepts valid profile", () => {
    expect(profileSchema.safeParse({ name: "张三", email: "test@example.com" }).success).toBe(true);
  });
  it("rejects empty name", () => {
    expect(profileSchema.safeParse({ name: " ", email: "test@example.com" }).success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("accepts valid password change", () => {
    expect(passwordSchema.safeParse({ currentPassword: "old12345", newPassword: "new12345" }).success).toBe(true);
  });
  it("rejects short new password", () => {
    expect(passwordSchema.safeParse({ currentPassword: "old12345", newPassword: "abc" }).success).toBe(false);
  });
});

describe("workspaceSchema", () => {
  it("accepts valid workspace", () => {
    expect(workspaceSchema.safeParse({ name: "My Team", slug: "my-team" }).success).toBe(true);
  });
  it("rejects uppercase slug", () => {
    expect(workspaceSchema.safeParse({ name: "Team", slug: "Team" }).success).toBe(false);
  });
  it("rejects slug with spaces", () => {
    expect(workspaceSchema.safeParse({ name: "Team", slug: "team a" }).success).toBe(false);
  });
  it("rejects short slug", () => {
    expect(workspaceSchema.safeParse({ name: "Team", slug: "a" }).success).toBe(false);
  });
});

describe("memberSchema", () => {
  it("accepts valid member", () => {
    expect(memberSchema.safeParse({ email: "user@example.com", role: "MEMBER" }).success).toBe(true);
  });
  it("rejects invalid role", () => {
    expect(memberSchema.safeParse({ email: "user@example.com", role: "KING" }).success).toBe(false);
  });
});

describe("invitationSchema", () => {
  it("accepts invitation without email", () => {
    expect(invitationSchema.safeParse({ email: "", role: "MEMBER" }).success).toBe(true);
  });
  it("accepts invitation with email", () => {
    expect(invitationSchema.safeParse({ email: "user@example.com", role: "ADMIN" }).success).toBe(true);
  });
});

describe("projectSchema", () => {
  it("accepts valid project", () => {
    expect(projectSchema.safeParse({ name: "平台改造", key: "PLAT", description: "" }).success).toBe(true);
  });
  it("rejects lowercase key", () => {
    expect(projectSchema.safeParse({ name: "项目", key: "plat", description: "" }).success).toBe(false);
  });
  it("rejects short key", () => {
    expect(projectSchema.safeParse({ name: "项目", key: "P", description: "" }).success).toBe(false);
  });
});

describe("projectMemberSchema", () => {
  it("accepts valid project member", () => {
    expect(projectMemberSchema.safeParse({ email: "user@example.com", role: "LEAD" }).success).toBe(true);
  });
  it("rejects invalid role", () => {
    expect(projectMemberSchema.safeParse({ email: "user@example.com", role: "OWNER" }).success).toBe(false);
  });
});

describe("issueSchema", () => {
  it("accepts core issue fields", () => {
    expect(issueSchema.safeParse({
      title: "修复登录",
      description: "",
      status: "TODO",
      priority: "HIGH",
      assigneeId: "",
      dueDate: "",
    }).success).toBe(true);
  });
  it("rejects empty title", () => {
    expect(issueSchema.safeParse({
      title: "",
      description: "",
      status: "TODO",
      priority: "MEDIUM",
      assigneeId: "",
      dueDate: "",
    }).success).toBe(false);
  });
  it("rejects invalid status", () => {
    expect(issueSchema.safeParse({
      title: "任务",
      description: "",
      status: "INVALID",
      priority: "MEDIUM",
      assigneeId: "",
      dueDate: "",
    }).success).toBe(false);
  });
});

describe("issueMoveSchema", () => {
  it("accepts valid move", () => {
    expect(issueMoveSchema.safeParse({ issueId: "abc123", status: "DONE" }).success).toBe(true);
  });
  it("accepts move with overIssueId", () => {
    expect(issueMoveSchema.safeParse({ issueId: "abc123", status: "IN_PROGRESS", overIssueId: "def456" }).success).toBe(true);
  });
  it("rejects empty issueId", () => {
    expect(issueMoveSchema.safeParse({ issueId: "", status: "DONE" }).success).toBe(false);
  });
});

describe("commentSchema", () => {
  it("accepts valid comment", () => {
    expect(commentSchema.safeParse({ body: "好的，我来处理" }).success).toBe(true);
  });
  it("rejects empty comment", () => {
    expect(commentSchema.safeParse({ body: "" }).success).toBe(false);
  });
  it("rejects whitespace-only comment", () => {
    expect(commentSchema.safeParse({ body: "   " }).success).toBe(false);
  });
});
