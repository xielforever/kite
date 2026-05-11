"use client";

import { useState } from "react";
import { Plus, Settings, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import { IssueForm } from "@/components/issue-form";
import { ProjectEditForm } from "@/components/project-edit-form";
import { ProjectForm } from "@/components/project-form";
import { ProjectMemberPanel } from "@/components/project-member-panel";
import type { ProjectRoleValue } from "@/lib/constants";

type MemberOption = { id: string; name: string; email: string };
type ProjectMember = { id: string; role: ProjectRoleValue; user: { id: string; name: string; email: string } };

export function CreateProjectDialog({ workspaceSlug }: { workspaceSlug: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="mr-1 h-4 w-4" />
        新建项目
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>新建项目</DialogTitle>
          <DialogDescription>创建项目时必须指定项目负责人，负责人会以 LEAD 角色加入项目。</DialogDescription>
        </DialogHeader>
        <ProjectForm workspaceSlug={workspaceSlug} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function CreateIssueDialog({
  workspaceSlug,
  projectKey,
  members,
  currentUserId,
}: {
  workspaceSlug: string;
  projectKey: string;
  members: MemberOption[];
  currentUserId?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="mr-1 h-4 w-4" />
        新建任务
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>新建任务</DialogTitle>
          <DialogDescription>在当前项目中创建一个新任务</DialogDescription>
        </DialogHeader>
        <IssueForm
          workspaceSlug={workspaceSlug}
          projectKey={projectKey}
          members={members}
          currentUserId={currentUserId}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function ProjectMemberDialog({
  workspaceSlug,
  projectKey,
  members,
  canManage,
  currentUserId,
}: {
  workspaceSlug: string;
  projectKey: string;
  members: ProjectMember[];
  canManage: boolean;
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerLabel = canManage ? "成员管理" : "项目成员";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} size="sm" variant="outline">
        <Users className="mr-1 h-4 w-4" />
        {triggerLabel}
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>项目成员</DialogTitle>
          <DialogDescription>{canManage ? "管理项目的成员和权限" : "查看当前项目成员和角色"}</DialogDescription>
        </DialogHeader>
        <ProjectMemberPanel
          workspaceSlug={workspaceSlug}
          projectKey={projectKey}
          members={members}
          canManage={canManage}
          currentUserId={currentUserId}
        />
      </DialogContent>
    </Dialog>
  );
}

export function ProjectSettingsDialog({
  workspaceSlug,
  project,
  triggerClassName,
  triggerVariant = "ghost",
  triggerSize = "sm",
}: {
  workspaceSlug: string;
  project: { id: string; name: string; key: string; description?: string | null; defaultDueDays?: number | null };
  triggerClassName?: string;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} size={triggerSize} variant={triggerVariant} className={triggerClassName}>
        <Settings className="h-4 w-4" />
        设置
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>项目设置</DialogTitle>
          <DialogDescription>修改「{project.name}」的名称和描述</DialogDescription>
        </DialogHeader>
        <ProjectEditForm
          workspaceSlug={workspaceSlug}
          project={project}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
