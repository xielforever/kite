import { DeleteLabelForm } from "@/components/delete-label-form";
import { LabelEditForm } from "@/components/label-edit-form";

export function LabelList({
  workspaceSlug,
  projectKey,
  labels,
}: {
  workspaceSlug: string;
  projectKey: string;
  labels: { id: string; name: string; color: string }[];
}) {
  if (!labels.length) {
    return <p className="text-sm text-muted-foreground">暂无标签</p>;
  }

  return (
    <div className="space-y-3">
      {labels.map((label) => (
        <div key={label.id} className="rounded-md border p-3">
          <LabelEditForm workspaceSlug={workspaceSlug} projectKey={projectKey} label={label} />
          <DeleteLabelForm workspaceSlug={workspaceSlug} projectKey={projectKey} labelId={label.id} />
        </div>
      ))}
    </div>
  );
}
