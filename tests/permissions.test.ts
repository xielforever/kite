import { describe, expect, it } from "vitest";
import {
  canAccessAllWorkspaces,
  canChangeRole,
  canCreateWorkspace,
  canEditProjectContent,
  canManageProject,
  canManageWorkspace,
} from "@/lib/role-rules";

describe("permissions", () => {
  it("allows owner and admin to manage workspaces", () => {
    expect(canManageWorkspace("OWNER")).toBe(true);
    expect(canManageWorkspace("ADMIN")).toBe(true);
    expect(canManageWorkspace("MEMBER")).toBe(false);
  });

  it("only allows system admins to create workspaces", () => {
    expect(canAccessAllWorkspaces("SUPER_ADMIN")).toBe(true);
    expect(canAccessAllWorkspaces("USER")).toBe(false);
    expect(canCreateWorkspace("SUPER_ADMIN")).toBe(true);
    expect(canCreateWorkspace("USER")).toBe(false);
    expect(canCreateWorkspace(null)).toBe(false);
  });

  it("restricts role changes by actor role", () => {
    expect(canChangeRole("OWNER", "ADMIN")).toBe(true);
    expect(canChangeRole("ADMIN", "MEMBER")).toBe(true);
    expect(canChangeRole("ADMIN", "OWNER")).toBe(false);
    expect(canChangeRole("MEMBER", "ADMIN")).toBe(false);
  });

  it("maps project roles to project permissions", () => {
    expect(canManageProject("LEAD")).toBe(true);
    expect(canManageProject("MEMBER")).toBe(false);
    expect(canEditProjectContent("MEMBER")).toBe(true);
    expect(canEditProjectContent("VIEWER")).toBe(false);
  });
});
