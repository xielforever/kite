import Link from "next/link";
import { IssueCard } from "@/components/issue-card";
import { IssueFilters } from "@/components/issue-filters";
import { CreateIssueDialog, ProjectMemberDialog } from "@/components/project-dialogs";
import { Pagination } from "@/components/pagination";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProjectPageData } from "@/lib/project-data";

export default async function ProjectIssuesPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string; projectKey: string }>;
  searchParams: Promise<{ q?: string; status?: string; priority?: string; assignee?: string; page?: string }>;
}) {
  const { workspaceSlug, projectKey } = await params;
  const filters = await searchParams;
  const { user, workspace, project, members, issues, totalIssues, page, pageSize, canEditProject, canManageProject } = await getProjectPageData(workspaceSlug, projectKey, { ...filters, page: filters.page ? parseInt(filters.page, 10) : undefined });
  const memberOptions = members.map((member) => ({ id: member.user.id, name: member.user.name, email: member.user.email }));

  return (
    <AppShell title={`${project.name} 任务`} subtitle={workspace.name} workspaceSlug={workspaceSlug}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant="ghost">
          <Link href={`/w/${workspaceSlug}/projects/${projectKey}/board`}>看板</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/w/${workspaceSlug}/projects/${projectKey}/issues`}>列表</Link>
        </Button>
        <div className="flex-1" />
        {canEditProject ? (
          <CreateIssueDialog workspaceSlug={workspaceSlug} projectKey={projectKey} members={memberOptions} currentUserId={user.id} />
        ) : null}
        <ProjectMemberDialog workspaceSlug={workspaceSlug} projectKey={projectKey} members={members} canManage={canManageProject} />
      </div>
      <IssueFilters members={memberOptions} />
      <div className="space-y-3">
        {issues.map((issue) => (
          <IssueCard key={issue.id} issue={issue} href={`/w/${workspaceSlug}/projects/${projectKey}/issues/${issue.id}`} />
        ))}
        {!issues.length ? (
          <Card>
            <CardContent className="pt-5 text-sm text-muted-foreground">暂无任务</CardContent>
          </Card>
        ) : null}
        <Pagination total={totalIssues} pageSize={pageSize} currentPage={page} />
      </div>
    </AppShell>
  );
}
