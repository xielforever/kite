import { describe, expect, it } from "vitest";
import { z } from "zod";

const workspaceSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().min(2).max(48).regex(/^[a-z0-9-]+$/),
});

const issueSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  assigneeId: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  labelIds: z.array(z.string()).optional(),
});

const issueMoveSchema = z.object({
  issueId: z.string().min(1),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  overIssueId: z.string().optional(),
});

const labelSchema = z.object({
  name: z.string().trim().min(1).max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

describe("validators", () => {
  it("accepts core issue fields", () => {
    const parsed = issueSchema.safeParse({
      title: "修复登录",
      description: "",
      status: "TODO",
      priority: "HIGH",
      assigneeId: "",
      dueDate: "",
      labelIds: [],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid workspace slug", () => {
    expect(workspaceSchema.safeParse({ name: "Team", slug: "Team A" }).success).toBe(false);
  });

  it("validates label colors and issue moves", () => {
    expect(labelSchema.safeParse({ name: "前端", color: "#2563eb" }).success).toBe(true);
    expect(labelSchema.safeParse({ name: "前端", color: "blue" }).success).toBe(false);
    expect(issueMoveSchema.safeParse({ issueId: "1", status: "DONE" }).success).toBe(true);
  });
});
