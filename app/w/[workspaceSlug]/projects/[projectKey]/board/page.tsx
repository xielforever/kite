import Link from "next/link";
import { IssueBoard } from "@/components/issue-board";
import { IssueFilters } from "@/components/issue-filters";
import { CreateIssueDialog, ProjectMemberDialog } from "@/components/project-dialogs";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProjectPageData } from "@/lib/project-data";

export default async function ProjectBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string; projectKey: string }>;
  searchParams: Promise<{ q?: string; status?: string; priority?: string; assignee?: string }>;
}) {
  const { workspaceSlug, projectKey } = await params;
  const filters = await searchParams;
  const { user, workspace, project, members, issues, canEditProject, canManageProject } = await getProjectPageData(workspaceSlug, projectKey, filters);
  const memberOptions = members.map((member) => ({ id: member.user.id, name: member.user.name, email: member.user.email }));
  const permissionLabel = canManageProject ? "可管理" : canEditProject ? "可编辑" : "只读";

  return (
    <AppShell title={`${project.name} 看板`} subtitle={workspace.name} workspaceSlug={workspaceSlug}>
      <div className="mb-4 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <Badge>{project.key}</Badge>
            <Badge>{permissionLabel}</Badge>
            <Badge className="border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
              成员 {members.length}
            </Badge>
            <Badge className={project.defaultDueDays ? "" : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"}>
              默认截止 {project.defaultDueDays ? `${project.defaultDueDays} 天` : "未设置"}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/w/${workspaceSlug}/projects/${projectKey}/board`}>看板</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href={`/w/${workspaceSlug}/projects/${projectKey}/issues`}>列表</Link>
            </Button>
            {canEditProject ? (
              <CreateIssueDialog workspaceSlug={workspaceSlug} projectKey={projectKey} members={memberOptions} currentUserId={user.id} />
            ) : null}
            <ProjectMemberDialog workspaceSlug={workspaceSlug} projectKey={projectKey} members={members} canManage={canManageProject} />
          </div>
        </div>
      </div>
      <IssueFilters members={memberOptions} />
      <IssueBoard issues={issues} workspaceSlug={workspaceSlug} projectKey={projectKey} canMove={canEditProject} />
    </AppShell>
  );
}
