import Link from "next/link";
import { IssueBoard } from "@/components/issue-board";
import { IssueFilters } from "@/components/issue-filters";
import { CreateIssueDialog, ProjectMemberDialog } from "@/components/project-dialogs";
import { AppShell } from "@/components/app-shell";
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

  return (
    <AppShell title={`${project.name} 看板`} subtitle={workspace.name} workspaceSlug={workspaceSlug}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={`/w/${workspaceSlug}/projects/${projectKey}/board`}>看板</Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/w/${workspaceSlug}/projects/${projectKey}/issues`}>列表</Link>
        </Button>
        <div className="flex-1" />
        {canEditProject ? (
          <CreateIssueDialog workspaceSlug={workspaceSlug} projectKey={projectKey} members={memberOptions} currentUserId={user.id} />
        ) : null}
        <ProjectMemberDialog workspaceSlug={workspaceSlug} projectKey={projectKey} members={members} canManage={canManageProject} />
      </div>
      <IssueFilters members={memberOptions} />
      <IssueBoard issues={issues} workspaceSlug={workspaceSlug} projectKey={projectKey} canMove={canEditProject} />
    </AppShell>
  );
}
