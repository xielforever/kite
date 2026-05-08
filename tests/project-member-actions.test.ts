import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const prisma = {
    projectMember: {
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
  };

  return {
    prisma,
    revalidatePath: vi.fn(),
    requireProjectAdmin: vi.fn(),
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
    requireProjectAdmin: mocks.requireProjectAdmin,
    requireProjectAdminById: vi.fn(),
    requireProjectEditor: vi.fn(),
    requireSystemAdmin: vi.fn(),
    requireUser: vi.fn(),
  };
});

import { updateProjectMemberRoleAction } from "@/lib/actions";

describe("project member actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireProjectAdmin.mockResolvedValue({
      project: { id: "project-id", key: "PLAT" },
    });
    mocks.prisma.projectMember.update.mockResolvedValue({});
  });

  it("does not update a member from another project", async () => {
    mocks.prisma.projectMember.findUnique.mockResolvedValue({
      id: "member-id",
      projectId: "other-project",
      role: "MEMBER",
    });

    await updateProjectMemberRoleAction("workspace", "PLAT", "member-id", "VIEWER");

    expect(mocks.prisma.projectMember.update).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("prevents demoting the last project lead", async () => {
    mocks.prisma.projectMember.findUnique.mockResolvedValue({
      id: "lead-id",
      projectId: "project-id",
      role: "LEAD",
    });
    mocks.prisma.projectMember.count.mockResolvedValue(1);

    await expect(updateProjectMemberRoleAction("workspace", "PLAT", "lead-id", "MEMBER")).rejects.toThrow(
      "最后一个项目负责人",
    );

    expect(mocks.prisma.projectMember.update).not.toHaveBeenCalled();
  });

  it("allows demoting a lead when another lead remains", async () => {
    mocks.prisma.projectMember.findUnique.mockResolvedValue({
      id: "lead-id",
      projectId: "project-id",
      role: "LEAD",
    });
    mocks.prisma.projectMember.count.mockResolvedValue(2);

    await updateProjectMemberRoleAction("workspace", "PLAT", "lead-id", "MEMBER");

    expect(mocks.prisma.projectMember.update).toHaveBeenCalledWith({
      where: { id: "lead-id" },
      data: { role: "MEMBER" },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/w/workspace/projects/PLAT");
  });
});
