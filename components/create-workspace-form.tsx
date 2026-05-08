"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { slugifyAscii } from "@/lib/utils";

type ActionState = {
  ok?: boolean;
  error?: string;
};

type CreateWorkspaceAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

function generatedSlug(value: string) {
  return slugifyAscii(value) || (value.trim() ? "workspace" : "");
}

export function CreateWorkspaceForm({ action }: { action: CreateWorkspaceAction }) {
  const [state, formAction] = useActionState(action, {});
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="slugMode" value={slugEdited ? "manual" : "auto"} />
      <div className="space-y-2">
        <Label htmlFor="workspace-name">名称</Label>
        <Input
          id="workspace-name"
          name="name"
          value={name}
          onChange={(event) => {
            const nextName = event.currentTarget.value;
            setName(nextName);
            if (!slugEdited) setSlug(generatedSlug(nextName));
          }}
          placeholder="例如：研发团队"
          required
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="workspace-slug">访问地址</Label>
          {!slugEdited ? <span className="text-xs text-muted-foreground">自动生成</span> : null}
        </div>
        <Input
          id="workspace-slug"
          name="slug"
          value={slug}
          onChange={(event) => {
            setSlugEdited(true);
            setSlug(slugifyAscii(event.currentTarget.value));
          }}
          placeholder="team-alpha"
          maxLength={48}
          required
        />
        <p className="text-xs text-muted-foreground">/w/{slug || "workspace"}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="workspace-description">描述</Label>
        <Textarea id="workspace-description" name="description" rows={2} placeholder="可选，简要描述工作区用途" />
      </div>
      <FormError message={state.error} />
      <SubmitButton pendingText="创建中...">创建工作区</SubmitButton>
    </form>
  );
}

export function CreateWorkspaceDialog({ action }: { action: CreateWorkspaceAction }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="h-4 w-4" />
        新建工作区
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>新建工作区</DialogTitle>
          <DialogDescription>工作区只承载项目集合，访问权限在项目成员中配置。</DialogDescription>
        </DialogHeader>
        <CreateWorkspaceForm action={action} />
      </DialogContent>
    </Dialog>
  );
}
