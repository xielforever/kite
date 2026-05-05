import { DeleteLabelForm } from "@/components/delete-label-form";
import { LabelEditForm } from "@/components/label-edit-form";
import { Badge } from "@/components/ui/badge";

export function LabelList({
  labels,
}: {
  labels: { id: string; name: string; color: string; issueCount?: number }[];
}) {
  if (!labels.length) {
    return <p className="text-sm text-muted-foreground">暂无标签</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      {labels.map((label) => (
        <div key={label.id} className="grid gap-3 border-b p-4 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: label.color }} />
              <span className="truncate text-sm font-medium">{label.name}</span>
              <Badge>{label.issueCount ?? 0} 个任务</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">全局标签，可用于所有工作区和项目。</p>
          </div>
          <div className="min-w-0">
            <LabelEditForm label={label} />
            <DeleteLabelForm labelId={label.id} />
          </div>
        </div>
      ))}
    </div>
  );
}
