import { updateWorkspaceAction } from "@/lib/actions";
import { requireWorkspaceAdmin } from "@/lib/permissions";
import { ActionForm } from "@/components/action-form";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default async function WorkspaceSettingsPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const { workspace } = await requireWorkspaceAdmin(workspaceSlug);
  const action = updateWorkspaceAction.bind(null, workspaceSlug);

  return (
    <AppShell title="工作区设置" subtitle={workspace.name} workspaceSlug={workspaceSlug}>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>基础信息</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={action} submitLabel="保存工作区">
            <div className="space-y-2">
              <Label htmlFor="name">名称</Label>
              <Input id="name" name="name" defaultValue={workspace.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" name="slug" defaultValue={workspace.slug} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea id="description" name="description" defaultValue={workspace.description ?? ""} rows={3} placeholder="可选，简要描述工作区用途" />
            </div>
          </ActionForm>
        </CardContent>
      </Card>
    </AppShell>
  );
}
