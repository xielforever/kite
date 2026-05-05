"use client";

import { updateLabelAction } from "@/lib/actions";
import { labelPalette } from "@/lib/constants";
import { ActionForm } from "@/components/action-form";
import { Input } from "@/components/ui/input";

export function LabelEditForm({
  workspaceSlug,
  projectKey,
  label,
}: {
  workspaceSlug: string;
  projectKey: string;
  label: { id: string; name: string; color: string };
}) {
  const action = updateLabelAction.bind(null, workspaceSlug, projectKey, label.id);

  return (
    <ActionForm action={action} submitLabel="保存" className="space-y-3">
      <div className="flex gap-2">
        <Input name="name" defaultValue={label.name} required />
        <input type="color" name="color" defaultValue={label.color} list={`palette-${label.id}`} className="h-9 w-12 rounded-md border bg-background" />
        <datalist id={`palette-${label.id}`}>
          {labelPalette.map((color) => (
            <option key={color} value={color} />
          ))}
        </datalist>
      </div>
    </ActionForm>
  );
}
