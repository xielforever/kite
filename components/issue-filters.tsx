"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { issuePriorities, issueStatuses, priorityLabels, statusLabels } from "@/lib/constants";

function IssueFiltersInner({
  members,
}: {
  members: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.replace(`?${next.toString()}`, { scroll: false });
  }

  const statusValue = issueStatuses.includes(searchParams.get("status") as (typeof issueStatuses)[number])
    ? searchParams.get("status")!
    : "";
  const priorityValue = issuePriorities.includes(searchParams.get("priority") as (typeof issuePriorities)[number])
    ? searchParams.get("priority")!
    : "";
  const assigneeValue = searchParams.get("assignee") ?? "";

  return (
    <div className="mb-4 grid gap-2 rounded-lg border bg-card p-3 sm:grid-cols-4">
      <input
        className="h-9 rounded-md border bg-background px-3 text-sm"
        defaultValue={searchParams.get("q") ?? ""}
        placeholder="搜索任务"
        aria-label="搜索任务"
        onKeyDown={(event) => {
          if (event.key === "Enter") updateFilter("q", event.currentTarget.value);
        }}
        onBlur={(event) => updateFilter("q", event.currentTarget.value)}
      />
      <select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={statusValue} onChange={(event) => updateFilter("status", event.target.value)} aria-label="状态筛选">
        <option value="">全部状态</option>
        {Object.entries(statusLabels).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={priorityValue} onChange={(event) => updateFilter("priority", event.target.value)} aria-label="优先级筛选">
        <option value="">全部优先级</option>
        {Object.entries(priorityLabels).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={assigneeValue} onChange={(event) => updateFilter("assignee", event.target.value)} aria-label="负责人筛选">
        <option value="">全部负责人</option>
        <option value="unassigned">未分配</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>{member.name}</option>
        ))}
      </select>
    </div>
  );
}

export function IssueFilters({ members }: { members: { id: string; name: string }[] }) {
  return (
    <Suspense fallback={<div className="mb-4 h-[52px] rounded-lg border bg-card p-3" />}>
      <IssueFiltersInner members={members} />
    </Suspense>
  );
}
