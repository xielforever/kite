import Link from "next/link";
import { deleteProjectAction, restoreProjectAction } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/permissions";
import { canAccessAllWorkspaces, canManageProject } from "@/lib/role-rules";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

export default async function ArchivedProjectsPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const { user, workspace } = await requireWorkspace(workspaceSlug);
  const isSystemAdmin = canAccessAllWorkspaces(user.systemRole);
  const projects = await prisma.project.findMany({
    where: {
      workspaceId: workspace.id,
      archived: true,
      ...(isSystemAdmin ? {} : { members: { some: { userId: user.id, role: "LEAD" } } }),
    },
    include: { members: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <AppShell title="归档项目" subtitle={workspace.name} workspaceSlug={workspaceSlug}>
      <div className="mb-4">
        <Button asChild variant="outline" size="sm">
          <Link href={`/w/${workspaceSlug}/projects`}>返回项目</Link>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => {
          const projectMembership = project.members.find((member) => member.userId === user.id);
          const canManage = isSystemAdmin || canManageProject(projectMembership?.role);
          return (
          <Card key={project.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle>{project.name}</CardTitle>
                <Badge>{project.key}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{project.description || "暂无描述"}</p>
              {canManage ? (
                <div className="flex gap-2">
                  <form
                    action={async () => {
                      "use server";
                      await restoreProjectAction(workspaceSlug, project.id);
                    }}
                  >
                    <ConfirmSubmitButton size="sm" message="确定恢复这个项目？">恢复</ConfirmSubmitButton>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await deleteProjectAction(workspaceSlug, project.id);
                    }}
                  >
                    <ConfirmSubmitButton size="sm" variant="destructive" message="确定永久删除这个归档项目？相关任务和评论都会删除。">删除</ConfirmSubmitButton>
                  </form>
                </div>
              ) : null}
            </CardContent>
          </Card>
          );
        })}
        {!projects.length ? (
          <Card>
            <CardContent className="pt-5 text-sm text-muted-foreground">暂无归档项目</CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
