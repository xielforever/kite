import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { CommentEditForm } from "@/components/comment-edit-form";
import { CommentForm } from "@/components/comment-form";
import { IssueForm } from "@/components/issue-form";
import { IssueStatusActions } from "@/components/issue-status-actions";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { deleteCommentAction, deleteIssueAction } from "@/lib/actions";
import { priorityLabels, statusLabels, userPublicFields } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { requireProject } from "@/lib/permissions";
import { formatDate, formatDateTime } from "@/lib/utils";

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; projectKey: string; issueId: string }>;
}) {
  const { workspaceSlug, projectKey, issueId } = await params;
  const { workspace, project, user, canEditProject } = await requireProject(workspaceSlug, projectKey);
  const [members, issue] = await Promise.all([
    prisma.projectMember.findMany({ where: { projectId: project.id }, include: { user: { select: userPublicFields } } }),
    prisma.issue.findFirst({
      where: { id: issueId, projectId: project.id },
      include: {
        assignee: { select: userPublicFields },
        creator: { select: userPublicFields },
        comments: { include: { author: { select: userPublicFields } }, orderBy: { createdAt: "asc" } },
        activities: { include: { actor: { select: userPublicFields } }, orderBy: { createdAt: "desc" } },
      },
    }),
  ]);

  if (!issue) notFound();

  const memberOptions = members.map((member) => ({ id: member.user.id, name: member.user.name, email: member.user.email }));

  return (
    <AppShell title={`${project.key}-${issue.number} ${issue.title}`} subtitle={`${workspace.name} / ${project.name}`} workspaceSlug={workspaceSlug}>
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>任务信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <p><span className="text-muted-foreground">状态：</span>{statusLabels[issue.status]}</p>
                <p><span className="text-muted-foreground">优先级：</span>{priorityLabels[issue.priority]}</p>
                <p><span className="text-muted-foreground">负责人：</span>{issue.assignee?.name ?? "未分配"}</p>
                <p><span className="text-muted-foreground">截止日期：</span>{formatDate(issue.dueDate)}</p>
                <p><span className="text-muted-foreground">创建人：</span>{issue.creator.name}</p>
                <p><span className="text-muted-foreground">创建时间：</span>{formatDate(issue.createdAt)}</p>
                <p><span className="text-muted-foreground">更新时间：</span>{formatDate(issue.updatedAt)}</p>
              </div>
              <div>
                <p className="mb-1 text-muted-foreground">描述</p>
                <p className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3">{issue.description || "暂无描述"}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>活动记录</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {issue.activities.map((activity) => (
                <div key={activity.id} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{activity.actor?.name ?? "已删除用户"} · {activity.action}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(activity.createdAt)}</p>
                  </div>
                  {activity.detail ? <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{activity.detail}</p> : null}
                </div>
              ))}
              {!issue.activities.length ? <p className="text-sm text-muted-foreground">暂无活动记录</p> : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>评论</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {issue.comments.map((comment) => (
                <div key={comment.id} className="rounded-md border p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{comment.author?.name ?? "已删除用户"}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</p>
                    </div>
                    {comment.authorId === user.id ? (
                      <form
                        action={async () => {
                          "use server";
                          await deleteCommentAction(workspaceSlug, projectKey, issueId, comment.id);
                        }}
                      >
                        <ConfirmSubmitButton size="icon" variant="ghost" title="删除评论" message="确定删除这条评论？">
                          <Trash2 className="h-4 w-4" />
                        </ConfirmSubmitButton>
                      </form>
                    ) : null}
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
                  {comment.authorId === user.id ? (
                    <details className="mt-3 rounded-md border p-3">
                      <summary className="cursor-pointer text-sm font-medium">编辑评论</summary>
                      <div className="mt-3">
                        <CommentEditForm workspaceSlug={workspaceSlug} projectKey={projectKey} comment={comment} />
                      </div>
                    </details>
                  ) : null}
                </div>
              ))}
              {canEditProject ? (
                <CommentForm workspaceSlug={workspaceSlug} projectKey={projectKey} issueId={issue.id} />
              ) : null}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          {canEditProject ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>状态流转</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <IssueStatusActions workspaceSlug={workspaceSlug} projectKey={projectKey} issueId={issue.id} currentStatus={issue.status} />
                  <p className="text-xs text-muted-foreground">状态变更会写入活动记录，任务内容编辑不会改变状态。</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>编辑任务内容</CardTitle>
                </CardHeader>
                <CardContent>
                  <IssueForm
                    workspaceSlug={workspaceSlug}
                    projectKey={projectKey}
                    members={memberOptions}
                    defaults={{
                      id: issue.id,
                      title: issue.title,
                      description: issue.description,
                      status: issue.status,
                      priority: issue.priority,
                      assigneeId: issue.assigneeId,
                      dueDate: issue.dueDate,
                    }}
                  />
                </CardContent>
              </Card>
              <form
                action={async () => {
                  "use server";
                  await deleteIssueAction(workspaceSlug, projectKey, issue.id);
                }}
              >
                <ConfirmSubmitButton variant="destructive" message="确定删除这个任务？评论和活动记录都会删除。">
                  <Trash2 className="h-4 w-4" />
                  删除任务
                </ConfirmSubmitButton>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
