import { describe, expect, it } from "vitest";
import {
  canAccessAllWorkspaces,
  canCreateWorkspace,
  canEditProjectContent,
  canManageProject,
} from "@/lib/role-rules";

describe("permissions", () => {
  it("only allows system admins to create workspaces", () => {
    expect(canAccessAllWorkspaces("SUPER_ADMIN")).toBe(true);
    expect(canAccessAllWorkspaces("USER")).toBe(false);
    expect(canCreateWorkspace("SUPER_ADMIN")).toBe(true);
    expect(canCreateWorkspace("USER")).toBe(false);
    expect(canCreateWorkspace(null)).toBe(false);
  });

  it("maps project roles to project permissions", () => {
    expect(canManageProject("LEAD")).toBe(true);
    expect(canManageProject("MEMBER")).toBe(false);
    expect(canEditProjectContent("MEMBER")).toBe(true);
    expect(canEditProjectContent("VIEWER")).toBe(false);
  });
});
