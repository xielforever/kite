import { addProjectMemberAction, removeProjectMemberAction, updateProjectMemberRoleAction } from "@/lib/actions";
import { projectRoleLabels, projectRoles, type ProjectRoleValue } from "@/lib/constants";
import { ActionForm } from "@/components/action-form";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProjectMemberPanel({
  workspaceSlug,
  projectKey,
  members,
  canManage,
}: {
  workspaceSlug: string;
  projectKey: string;
  members: { id: string; role: ProjectRoleValue; user: { name: string; email: string } }[];
  canManage: boolean;
}) {
  const addProjectMember = addProjectMemberAction.bind(null, workspaceSlug, projectKey);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {members.map((member) => (
          <div key={member.id} className="rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{member.user.name}</p>
                <p className="text-xs text-muted-foreground">{member.user.email}</p>
              </div>
              {canManage ? (
                <form
                  action={async (formData) => {
                    "use server";
                    await updateProjectMemberRoleAction(workspaceSlug, projectKey, member.id, String(formData.get("role") ?? ""));
                  }}
                  className="flex items-center gap-2"
                >
                  <select name="role" defaultValue={member.role} className="h-9 rounded-md border bg-background px-2 text-sm" aria-label={`修改 ${member.user.name} 的项目角色`}>
                    {projectRoles.map((role) => (
                      <option key={role} value={role}>
                        {projectRoleLabels[role]}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" variant="outline">
                    保存
                  </Button>
                </form>
              ) : (
                <Badge>{projectRoleLabels[member.role]}</Badge>
              )}
            </div>
            {canManage ? (
              <form
                action={async () => {
                  "use server";
                  await removeProjectMemberAction(workspaceSlug, projectKey, member.id);
                }}
                className="mt-3"
              >
                <ConfirmSubmitButton size="sm" variant="ghost" message="确定移除该项目成员？">
                  移除
                </ConfirmSubmitButton>
              </form>
            ) : null}
          </div>
        ))}
      </div>
      {canManage ? (
        <ActionForm action={addProjectMember} submitLabel="添加项目成员">
          <div className="space-y-2">
            <Label htmlFor="project-member-email">工作区成员邮箱</Label>
            <Input id="project-member-email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-member-role">项目角色</Label>
            <select id="project-member-role" name="role" defaultValue="MEMBER" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
              {projectRoles.map((role) => (
                <option key={role} value={role}>
                  {projectRoleLabels[role]}
                </option>
              ))}
            </select>
          </div>
        </ActionForm>
      ) : null}
    </div>
  );
}
