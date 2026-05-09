import { notFound } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { CommentEditForm } from "@/components/comment-edit-form";
import { CommentForm } from "@/components/comment-form";
import { IssueForm } from "@/components/issue-form";
import { IssueStatusActions } from "@/components/issue-status-actions";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { deleteCommentAction, deleteIssueAction } from "@/lib/actions";
import { priorityLabels, statusLabels, userPublicFields } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { requireProject } from "@/lib/permissions";
import { formatDate, formatDateTime } from "@/lib/utils";

function statusTone(status: string) {
  if (status === "TODO") return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200";
  if (status === "IN_PROGRESS") return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200";
  if (status === "REVIEW") return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200";
  if (status === "DONE") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
  return "border-muted bg-muted text-muted-foreground";
}

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
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>任务信息</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge className={statusTone(issue.status)}>{statusLabels[issue.status]}</Badge>
                  <Badge>{priorityLabels[issue.priority]}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <p><span className="text-muted-foreground">优先级：</span>{priorityLabels[issue.priority]}</p>
                <p><span className="text-muted-foreground">负责人：</span>{issue.assignee?.name ?? "未分配"}</p>
                <p><span className="text-muted-foreground">截止日期：</span>{formatDate(issue.dueDate)}</p>
                <p><span className="text-muted-foreground">创建人：</span>{issue.creator.name}</p>
                <p><span className="text-muted-foreground">创建时间：</span>{formatDateTime(issue.createdAt)}</p>
                <p><span className="text-muted-foreground">更新时间：</span>{formatDateTime(issue.updatedAt)}</p>
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
                      <p className="text-xs text-muted-foreground">{formatDateTime(comment.createdAt)}</p>
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
              <Card className="border-primary/30">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>任务流转</CardTitle>
                    <Badge className={statusTone(issue.status)}>{statusLabels[issue.status]}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-5">
                  <IssueStatusActions workspaceSlug={workspaceSlug} projectKey={projectKey} issueId={issue.id} currentStatus={issue.status} />
                  <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    状态变更会写入活动记录；内容编辑不会改变任务状态。
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="border-b">
                  <CardTitle>内容维护</CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
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
              <Card className="border-destructive/30 bg-destructive/5">
                <CardHeader className="border-b border-destructive/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <CardTitle>危险操作</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-5">
                  <p className="text-sm text-muted-foreground">删除后评论和活动记录会一并移除。</p>
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
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
