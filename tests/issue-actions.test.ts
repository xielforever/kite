import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const prisma = {
    projectMember: {
      findFirst: vi.fn(),
    },
    issue: {
      aggregate: vi.fn(),
      create: vi.fn(),
    },
    project: {
      update: vi.fn(),
    },
    issueActivity: {
      create: vi.fn(),
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

import { createIssueAction } from "@/lib/actions";

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
    mocks.prisma.issueActivity.create.mockResolvedValue({});
    mocks.prisma.$transaction.mockImplementation(async (callback) => callback(mocks.prisma));
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
});
