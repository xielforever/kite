"use client";

import { useState } from "react";
import { updateMemberRoleAction } from "@/lib/actions";
import { roleLabels, type WorkspaceRoleValue } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export function MemberRoleSelect({
  workspaceSlug,
  memberId,
  currentRole,
  availableRoles,
  projectCount,
}: {
  workspaceSlug: string;
  memberId: string;
  currentRole: WorkspaceRoleValue;
  availableRoles: WorkspaceRoleValue[];
  projectCount: number;
}) {
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isDowngrade =
    (currentRole === "OWNER" || currentRole === "ADMIN") &&
    selectedRole === "MEMBER";

  function handleSubmit() {
    if (isDowngrade) {
      setConfirmOpen(true);
    } else {
      updateMemberRoleAction(workspaceSlug, memberId, selectedRole);
    }
  }

  function handleConfirm() {
    setConfirmOpen(false);
    updateMemberRoleAction(workspaceSlug, memberId, selectedRole);
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as WorkspaceRoleValue)}
          className="h-9 rounded-md border bg-background px-2 text-sm"
        >
          {availableRoles.map((role) => (
            <option key={role} value={role}>{roleLabels[role]}</option>
          ))}
        </select>
        <Button variant="outline" size="sm" onClick={handleSubmit}>
          保存
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认角色变更</DialogTitle>
            <DialogDescription>
              将该成员从「{roleLabels[currentRole]}」降级为「{roleLabels[selectedRole]}」。
              {projectCount > 0
                ? `此操作将影响该成员在 ${projectCount} 个项目中的权限，项目角色将被调整为项目成员。`
                : "该成员未参与任何项目。"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">取消</Button>
            </DialogClose>
            <Button size="sm" onClick={handleConfirm}>确认降级</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
