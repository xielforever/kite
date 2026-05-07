"use client";

import { useEffect, useMemo, useState } from "react";
import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { statusColumns, statusLabels, type IssueStatusValue } from "@/lib/constants";
import { IssueCard, type IssueCardData } from "@/components/issue-card";

type BoardIssue = IssueCardData & { sortOrder: number };

function SortableIssue({
  issue,
  href,
  disabled,
}: {
  issue: BoardIssue;
  href: string;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: issue.id, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-60" : ""}
      {...attributes}
      {...listeners}
    >
      <IssueCard issue={issue} href={href} />
    </div>
  );
}

export function IssueBoard({
  issues,
  workspaceSlug,
  projectKey,
  canMove,
}: {
  issues: BoardIssue[];
  workspaceSlug: string;
  projectKey: string;
  canMove: boolean;
}) {
  const [localIssues, setLocalIssues] = useState(issues);
  const [toast, setToast] = useState<{ type: "ok" | "err"; message: string } | null>(null);
  useEffect(() => {
    setLocalIssues(issues);
  }, [issues]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const grouped = useMemo(() => statusColumns.reduce<Record<IssueStatusValue, BoardIssue[]>>((acc, status) => {
    acc[status] = localIssues.filter((issue) => issue.status === status);
    return acc;
  }, {} as Record<IssueStatusValue, BoardIssue[]>), [localIssues]);

  async function onDragEnd(event: DragEndEvent) {
    if (!canMove) return;
    const activeId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : undefined;
    if (!overId) return;

    const status = statusColumns.includes(overId as IssueStatusValue)
      ? (overId as IssueStatusValue)
      : localIssues.find((issue) => issue.id === overId)?.status;
    if (!status) return;

    setLocalIssues((current) =>
      current.map((issue) => (issue.id === activeId ? { ...issue, status, sortOrder: Date.now() } : issue)),
    );

    const response = await fetch(`/api/issues/${activeId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issueId: activeId, status, overIssueId: overId === status ? undefined : overId }),
    });
    if (!response.ok) {
      setLocalIssues(issues);
      setToast({ type: "err", message: "移动失败，已回滚" });
    } else {
      setToast({ type: "ok", message: `已移至${statusLabels[status]}` });
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="relative">
        {toast ? (
          <div className={`fixed bottom-4 right-4 z-50 rounded-md px-4 py-2 text-sm font-medium shadow-lg transition-opacity ${toast.type === "ok" ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`}>
            {toast.message}
          </div>
        ) : null}
      </div>
      <div className="grid gap-4 lg:grid-cols-3 md:grid-cols-1">
        {statusColumns.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            issues={grouped[status]}
            workspaceSlug={workspaceSlug}
            projectKey={projectKey}
            canMove={canMove}
          />
        ))}
      </div>
    </DndContext>
  );
}

function BoardColumn({
  status,
  issues,
  workspaceSlug,
  projectKey,
  canMove,
}: {
  status: IssueStatusValue;
  issues: BoardIssue[];
  workspaceSlug: string;
  projectKey: string;
  canMove: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div ref={setNodeRef} className={isOver ? "rounded-lg border border-primary bg-primary/5 p-3" : "rounded-lg border bg-muted/40 p-3"}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{statusLabels[status]}</h2>
        <span className="text-xs text-muted-foreground">{issues.length}</span>
      </div>
      <SortableContext items={issues.map((issue) => issue.id)} strategy={verticalListSortingStrategy}>
        <div className="min-h-40 space-y-3">
          {issues.map((issue) => (
            <SortableIssue
              key={issue.id}
              issue={issue}
              href={`/w/${workspaceSlug}/projects/${projectKey}/issues/${issue.id}`}
              disabled={!canMove}
            />
          ))}
          {!issues.length ? (
            <div className="rounded-md border border-dashed bg-background/70 p-4 text-center text-sm text-muted-foreground">
              暂无任务
            </div>
          ) : null}
        </div>
      </SortableContext>
    </div>
  );
}
