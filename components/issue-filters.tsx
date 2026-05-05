"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { priorityLabels, statusLabels } from "@/lib/constants";

export function IssueFilters({
  members,
  labels,
}: {
  members: { id: string; name: string }[];
  labels: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="mb-4 grid gap-2 rounded-lg border bg-card p-3 sm:grid-cols-5">
      <input
        className="h-9 rounded-md border bg-background px-3 text-sm"
        defaultValue={searchParams.get("q") ?? ""}
        placeholder="搜索任务"
        onKeyDown={(event) => {
          if (event.key === "Enter") updateFilter("q", event.currentTarget.value);
        }}
        onBlur={(event) => updateFilter("q", event.currentTarget.value)}
      />
      <select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={searchParams.get("status") ?? ""} onChange={(event) => updateFilter("status", event.target.value)}>
        <option value="">全部状态</option>
        {Object.entries(statusLabels).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={searchParams.get("priority") ?? ""} onChange={(event) => updateFilter("priority", event.target.value)}>
        <option value="">全部优先级</option>
        {Object.entries(priorityLabels).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={searchParams.get("assignee") ?? ""} onChange={(event) => updateFilter("assignee", event.target.value)}>
        <option value="">全部负责人</option>
        <option value="unassigned">未分配</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>{member.name}</option>
        ))}
      </select>
      <select className="h-9 rounded-md border bg-background px-3 text-sm" defaultValue={searchParams.get("label") ?? ""} onChange={(event) => updateFilter("label", event.target.value)}>
        <option value="">全部标签</option>
        {labels.map((label) => (
          <option key={label.id} value={label.id}>{label.name}</option>
        ))}
      </select>
    </div>
  );
}
