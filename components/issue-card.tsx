import Link from "next/link";
import { AlertTriangle, CalendarDays, UserCircle } from "lucide-react";
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
  const unassigned = !issue.assignee;
  const noDueDate = !issue.dueDate;
  const needsAttention = unassigned || noDueDate;

  return (
    <Link href={href} className="block rounded-lg border bg-card p-3 shadow-sm transition-colors hover:border-primary/50">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-medium">{issue.title}</h3>
        <Badge>{priorityLabels[issue.priority]}</Badge>
      </div>
      <div className="mb-3 text-xs font-medium text-muted-foreground">#{issue.number}</div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>{statusLabels[issue.status]}</span>
        <span className={`inline-flex items-center gap-1 ${unassigned ? "text-amber-600 dark:text-amber-400" : ""}`}>
          <UserCircle className="h-3.5 w-3.5" />{issue.assignee?.name ?? "未分配"}
        </span>
        <span className={`inline-flex items-center gap-1 ${noDueDate ? "text-amber-600 dark:text-amber-400" : ""}`}>
          <CalendarDays className="h-3.5 w-3.5" />{formatDate(issue.dueDate)}
        </span>
      </div>
      {needsAttention ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {unassigned ? (
            <Badge className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <UserCircle className="mr-1 h-3 w-3" />未分配
            </Badge>
          ) : null}
          {noDueDate ? (
            <Badge className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <AlertTriangle className="mr-1 h-3 w-3" />无截止日期
            </Badge>
          ) : null}
        </div>
      ) : null}
    </Link>
  );
}
