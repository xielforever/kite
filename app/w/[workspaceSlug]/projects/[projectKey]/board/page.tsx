import Link from "next/link";
import { IssueBoard } from "@/components/issue-board";
import { IssueFilters } from "@/components/issue-filters";
import { IssueForm } from "@/components/issue-form";
import { ProjectMemberPanel } from "@/components/project-member-panel";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const { workspace, project, members, issues, canEditProject, canManageProject } = await getProjectPageData(workspaceSlug, projectKey, filters);
  const memberOptions = members.map((member) => ({ id: member.user.id, name: member.user.name, email: member.user.email }));

  return (
    <AppShell title={`${project.name} 看板`} subtitle={workspace.name} workspaceSlug={workspaceSlug}>
      <div className="mb-4 flex gap-2">
        <Button asChild size="sm">
          <Link href={`/w/${workspaceSlug}/projects/${projectKey}/board`}>看板</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/w/${workspaceSlug}/projects/${projectKey}/issues`}>列表</Link>
        </Button>
      </div>
      <IssueFilters members={memberOptions} />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <IssueBoard issues={issues} workspaceSlug={workspaceSlug} projectKey={projectKey} canMove={canEditProject} />
        <div className="space-y-4">
          {canEditProject ? (
            <Card>
              <CardHeader>
                <CardTitle>新建任务</CardTitle>
              </CardHeader>
              <CardContent>
                <IssueForm workspaceSlug={workspaceSlug} projectKey={projectKey} members={memberOptions} />
              </CardContent>
            </Card>
          ) : null}
          {canManageProject ? (
            <Card>
              <CardHeader>
                <CardTitle>项目成员</CardTitle>
              </CardHeader>
              <CardContent>
                <ProjectMemberPanel workspaceSlug={workspaceSlug} projectKey={projectKey} members={members} canManage={canManageProject} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>项目成员</CardTitle>
              </CardHeader>
              <CardContent>
                <ProjectMemberPanel workspaceSlug={workspaceSlug} projectKey={projectKey} members={members} canManage={false} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
