import { addMemberAction, createInvitationAction, removeMemberAction, revokeInvitationAction, updateMemberRoleAction } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/permissions";
import { canManageWorkspace } from "@/lib/role-rules";
import { roleLabels, userPublicFields, workspaceRoles, type WorkspaceRoleValue } from "@/lib/constants";
import { AppShell } from "@/components/app-shell";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/copy-button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

export default async function MembersPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const { workspace, membership } = await requireWorkspace(workspaceSlug);
  const [members, invitations] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.id },
      include: { user: { select: userPublicFields } },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    prisma.workspaceInvitation.findMany({
      where: { workspaceId: workspace.id, acceptedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const canManage = canManageWorkspace(membership.role);
  const isOwner = membership.role === "OWNER";
  const addMember = addMemberAction.bind(null, workspaceSlug);
  const createInvite = createInvitationAction.bind(null, workspaceSlug);

  return (
    <AppShell title="成员管理" subtitle={workspace.name} workspaceSlug={workspaceSlug}>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>成员列表</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {members.map((member) => (
                <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                  <div>
                    <p className="font-medium">{member.user.name}</p>
                    <p className="text-sm text-muted-foreground">{member.user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManage && (isOwner || (member.role !== "OWNER" && member.role !== "ADMIN")) ? (
                      <form action={async (formData) => {
                        "use server";
                        await updateMemberRoleAction(workspaceSlug, member.id, formData.get("role") as WorkspaceRoleValue);
                      }}>
                        <select name="role" defaultValue={member.role} className="h-9 rounded-md border bg-background px-2 text-sm">
                          {workspaceRoles.map((role) => (
                            <option key={role} value={role}>{roleLabels[role]}</option>
                          ))}
                        </select>
                        <Button variant="outline" size="sm" className="ml-2">保存</Button>
                      </form>
                    ) : (
                      <span className="text-sm text-muted-foreground">{roleLabels[member.role]}</span>
                    )}
                    {canManage && (isOwner || (member.role !== "OWNER" && member.role !== "ADMIN")) ? (
                      <form action={async () => {
                        "use server";
                        await removeMemberAction(workspaceSlug, member.id);
                      }}>
                        <ConfirmSubmitButton variant="ghost" size="sm" message="确定移除该成员？">移除</ConfirmSubmitButton>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          {canManage ? (
            <Card>
              <CardHeader><CardTitle>待接受邀请</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {invitations.map((invitation) => {
                  const invitePath = `/invite/${invitation.token}`;
                  const inviteUrl = `${process.env.AUTH_URL ?? "http://localhost:3000"}${invitePath}`;
                  return (
                    <div key={invitation.id} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{invitation.email || "通用邀请链接"}</p>
                          <p className="break-all text-sm text-muted-foreground">{roleLabels[invitation.role]} · {inviteUrl}</p>
                        </div>
                        <CopyButton value={inviteUrl} />
                        <form action={async () => {
                          "use server";
                          await revokeInvitationAction(workspaceSlug, invitation.id);
                        }}>
                          <ConfirmSubmitButton variant="ghost" size="sm" message="确定撤销该邀请？">撤销</ConfirmSubmitButton>
                        </form>
                      </div>
                    </div>
                  );
                })}
                {!invitations.length ? <p className="text-sm text-muted-foreground">暂无待接受邀请</p> : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
        {canManage ? (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>邀请成员</CardTitle></CardHeader>
              <CardContent>
                <ActionForm action={createInvite} submitLabel="生成邀请链接">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">限定邮箱</Label>
                    <Input id="invite-email" name="email" type="email" placeholder="留空则任何登录用户可接受" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">角色</Label>
                    <select id="invite-role" name="role" defaultValue="MEMBER" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                      {(isOwner ? workspaceRoles : workspaceRoles.filter((r) => r === "MEMBER")).map((role) => (
                        <option key={role} value={role}>{roleLabels[role]}</option>
                      ))}
                    </select>
                  </div>
                </ActionForm>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>直接添加已注册用户</CardTitle></CardHeader>
              <CardContent>
                <ActionForm action={addMember} submitLabel="添加">
                  <div className="space-y-2">
                    <Label htmlFor="email">成员邮箱</Label>
                    <Input id="email" name="email" type="email" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">角色</Label>
                    <select id="role" name="role" defaultValue="MEMBER" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                      {(isOwner ? workspaceRoles : workspaceRoles.filter((r) => r === "MEMBER")).map((role) => (
                        <option key={role} value={role}>{roleLabels[role]}</option>
                      ))}
                    </select>
                  </div>
                </ActionForm>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
