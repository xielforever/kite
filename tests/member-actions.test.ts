import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const prisma = {
    workspaceMember: {
      findFirst: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
    },
    projectMember: {
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  return {
    prisma,
    revalidatePath: vi.fn(),
    requireWorkspaceAdmin: vi.fn(),
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
  forbidden: vi.fn(() => {
    throw new Error("forbidden");
  }),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/permissions", () => {
  class ForbiddenError extends Error {
    constructor(message = "没有权限执行此操作") {
      super(message);
      this.name = "ForbiddenError";
    }
  }

  return {
    ForbiddenError,
    requireWorkspaceAdmin: mocks.requireWorkspaceAdmin,
    requireProject: vi.fn(),
    requireProjectAdmin: vi.fn(),
    requireProjectAdminById: vi.fn(),
    requireProjectEditor: vi.fn(),
    requireSystemAdmin: vi.fn(),
    requireUser: vi.fn(),
  };
});

import { removeMemberAction, updateMemberRoleAction } from "@/lib/actions";

describe("workspace member actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireWorkspaceAdmin.mockResolvedValue({
      membership: { role: "OWNER" },
      workspace: { id: "workspace-a" },
    });
    mocks.prisma.$transaction.mockImplementation(async (callback) => callback(mocks.prisma));
    mocks.prisma.project.findMany.mockResolvedValue([]);
  });

  it("does not update a member outside the current workspace", async () => {
    mocks.prisma.workspaceMember.findFirst.mockResolvedValue(null);

    await updateMemberRoleAction("workspace-a", "member-from-workspace-b", "ADMIN");

    expect(mocks.prisma.workspaceMember.findFirst).toHaveBeenCalledWith({
      where: { id: "member-from-workspace-b", workspaceId: "workspace-a" },
    });
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("does not remove a member outside the current workspace", async () => {
    mocks.prisma.workspaceMember.findFirst.mockResolvedValue(null);

    await removeMemberAction("workspace-a", "member-from-workspace-b");

    expect(mocks.prisma.workspaceMember.findFirst).toHaveBeenCalledWith({
      where: { id: "member-from-workspace-b", workspaceId: "workspace-a" },
    });
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("updates an in-workspace member and revalidates the members page", async () => {
    mocks.prisma.workspaceMember.findFirst.mockResolvedValue({
      id: "member-a",
      userId: "user-a",
      workspaceId: "workspace-a",
      role: "MEMBER",
    });

    await updateMemberRoleAction("workspace-a", "member-a", "ADMIN");

    expect(mocks.prisma.workspaceMember.update).toHaveBeenCalledWith({
      where: { id: "member-a" },
      data: { role: "ADMIN" },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/w/workspace-a/settings/members");
  });

  it("removes an in-workspace member and project memberships in the same workspace", async () => {
    mocks.prisma.workspaceMember.findFirst.mockResolvedValue({
      id: "member-a",
      userId: "user-a",
      workspaceId: "workspace-a",
      role: "MEMBER",
    });

    await removeMemberAction("workspace-a", "member-a");

    expect(mocks.prisma.projectMember.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-a", project: { workspaceId: "workspace-a" } },
    });
    expect(mocks.prisma.workspaceMember.delete).toHaveBeenCalledWith({ where: { id: "member-a" } });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/w/workspace-a/settings/members");
  });
});
