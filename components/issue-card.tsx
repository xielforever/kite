import Link from "next/link";
import { CalendarDays, UserCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { priorityLabels, statusLabels, type IssuePriorityValue, type IssueStatusValue } from "@/lib/constants";

export type IssueCardData = {
  id: string;
  number: number;
  title: string;
  status: IssueStatusValue;
  priority: IssuePriorityValue;
  dueDate?: Date | null;
  assignee?: { name: string } | null;
};

export function IssueCard({
  issue,
  href,
}: {
  issue: IssueCardData;
  href: string;
}) {
  return (
    <Link href={href} className="block rounded-lg border bg-card p-3 shadow-sm transition-colors hover:border-primary/50">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-medium">{issue.title}</h3>
        <Badge>{priorityLabels[issue.priority]}</Badge>
      </div>
      <div className="mb-3 text-xs font-medium text-muted-foreground">#{issue.number}</div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>{statusLabels[issue.status]}</span>
        <span className="inline-flex items-center gap-1"><UserCircle className="h-3.5 w-3.5" />{issue.assignee?.name ?? "未分配"}</span>
        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(issue.dueDate)}</span>
      </div>
    </Link>
  );
}
