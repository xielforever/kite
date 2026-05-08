import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const prisma = {
    projectMember: {
      findFirst: vi.fn(),
    },
    issue: {
      aggregate: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    project: {
      update: vi.fn(),
    },
    issueActivity: {
      create: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  return {
    prisma,
    revalidatePath: vi.fn(),
    requireProjectEditor: vi.fn(),
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

vi.mock("@/lib/auth", () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/permissions", () => {
  class ForbiddenError extends Error {
    constructor(message = "forbidden") {
      super(message);
      this.name = "ForbiddenError";
    }
  }

  return {
    ForbiddenError,
    requireProject: vi.fn(),
    requireProjectAdmin: vi.fn(),
    requireProjectAdminById: vi.fn(),
    requireProjectEditor: mocks.requireProjectEditor,
    requireSystemAdmin: vi.fn(),
    requireUser: vi.fn(),
    requireWorkspaceAdmin: vi.fn(),
  };
});

import { createIssueAction, updateIssueAction } from "@/lib/actions";

describe("issue actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireProjectEditor.mockResolvedValue({
      user: { id: "actor-id" },
      project: {
        id: "project-id",
        key: "CGPT",
        defaultDueDays: null,
      },
    });
    mocks.prisma.projectMember.findFirst.mockResolvedValue({
      projectId: "project-id",
      userId: "assignee-id",
      role: "MEMBER",
    });
    mocks.prisma.issue.aggregate.mockResolvedValue({ _max: { sortOrder: null } });
    mocks.prisma.project.update.mockResolvedValue({ nextIssueNumber: 2 });
    mocks.prisma.issue.create.mockResolvedValue({ id: "issue-id" });
    mocks.prisma.issue.findFirst.mockResolvedValue({
      id: "issue-id",
      projectId: "project-id",
      title: "Old title",
      description: null,
      status: "TODO",
      priority: "LOW",
      assigneeId: null,
      dueDate: null,
    });
    mocks.prisma.issue.update.mockResolvedValue({});
    mocks.prisma.issueActivity.create.mockResolvedValue({});
    mocks.prisma.user.findMany.mockResolvedValue([{ id: "assignee-id", name: "Project Member", email: "member@example.com" }]);
    mocks.prisma.$transaction.mockImplementation(async (input) => (typeof input === "function" ? input(mocks.prisma) : Promise.all(input)));
  });

  it("validates assignees by project membership only", async () => {
    const formData = new FormData();
    formData.set("title", "Assign to project member");
    formData.set("description", "");
    formData.set("status", "TODO");
    formData.set("priority", "MEDIUM");
    formData.set("assigneeId", "assignee-id");
    formData.set("dueDate", "");

    const result = await createIssueAction("workspace", "CGPT", {}, formData);

    expect(result).toEqual({ ok: true });
    expect(mocks.prisma.projectMember.findFirst).toHaveBeenCalledWith({
      where: {
        projectId: "project-id",
        userId: "assignee-id",
      },
    });
  });

  it("records field-level issue update activities and ignores posted status", async () => {
    const formData = new FormData();
    formData.set("title", "New title");
    formData.set("description", "Detailed description");
    formData.set("status", "DONE");
    formData.set("priority", "HIGH");
    formData.set("assigneeId", "assignee-id");
    formData.set("dueDate", "2026-05-20");

    const result = await updateIssueAction("workspace", "CGPT", "issue-id", {}, formData);

    expect(result).toEqual({ ok: true });
    expect(mocks.prisma.issue.update).toHaveBeenCalledWith({
      where: { id: "issue-id" },
      data: {
        title: "New title",
        description: "Detailed description",
        priority: "HIGH",
        assigneeId: "assignee-id",
        dueDate: new Date("2026-05-20"),
      },
    });
    expect(mocks.prisma.issue.update.mock.calls[0][0].data).not.toHaveProperty("status");
    expect(mocks.prisma.issueActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        issueId: "issue-id",
        actorId: "actor-id",
        action: "更新任务字段",
        detail: expect.stringContaining("负责人：未分配 → Project Member"),
      }),
    });
  });

  it("does not write an activity when an issue edit has no field changes", async () => {
    mocks.prisma.issue.findFirst.mockResolvedValue({
      id: "issue-id",
      projectId: "project-id",
      title: "Same title",
      description: null,
      status: "TODO",
      priority: "MEDIUM",
      assigneeId: null,
      dueDate: null,
    });
    const formData = new FormData();
    formData.set("title", "Same title");
    formData.set("description", "");
    formData.set("status", "CLOSED");
    formData.set("priority", "MEDIUM");
    formData.set("assigneeId", "");
    formData.set("dueDate", "");

    const result = await updateIssueAction("workspace", "CGPT", "issue-id", {}, formData);

    expect(result).toEqual({ ok: true });
    expect(mocks.prisma.issue.update).not.toHaveBeenCalled();
    expect(mocks.prisma.issueActivity.create).not.toHaveBeenCalled();
  });
});
