import Link from "next/link";
import { IssueCard } from "@/components/issue-card";
import { IssueFilters } from "@/components/issue-filters";
import { IssueForm } from "@/components/issue-form";
import { ProjectMemberPanel } from "@/components/project-member-panel";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjectPageData } from "@/lib/project-data";

export default async function ProjectIssuesPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string; projectKey: string }>;
  searchParams: Promise<{ q?: string; status?: string; priority?: string; assignee?: string; label?: string }>;
}) {
  const { workspaceSlug, projectKey } = await params;
  const filters = await searchParams;
  const { workspace, project, members, labels, issues, canEditProject, canManageProject } = await getProjectPageData(workspaceSlug, projectKey, filters);
  const memberOptions = members.map((member) => ({ id: member.user.id, name: member.user.name, email: member.user.email }));

  return (
    <AppShell title={`${project.name} 任务`} subtitle={workspace.name} workspaceSlug={workspaceSlug}>
      <div className="mb-4 flex gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={`/w/${workspaceSlug}/projects/${projectKey}/board`}>看板</Link>
        </Button>
        <Button asChild size="sm">
          <Link href={`/w/${workspaceSlug}/projects/${projectKey}/issues`}>列表</Link>
        </Button>
      </div>
      <IssueFilters members={memberOptions} labels={labels} />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} href={`/w/${workspaceSlug}/projects/${projectKey}/issues/${issue.id}`} />
          ))}
          {!issues.length ? (
            <Card>
              <CardContent className="pt-5 text-sm text-muted-foreground">暂无任务</CardContent>
            </Card>
          ) : null}
        </div>
        <div className="space-y-4">
          {canEditProject ? (
            <Card>
              <CardHeader>
                <CardTitle>新建任务</CardTitle>
              </CardHeader>
              <CardContent>
                <IssueForm workspaceSlug={workspaceSlug} projectKey={projectKey} members={memberOptions} labels={labels} />
              </CardContent>
            </Card>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>项目成员</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectMemberPanel workspaceSlug={workspaceSlug} projectKey={projectKey} members={members} canManage={canManageProject} />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
