"use client";

import { useEffect, useMemo, useState } from "react";
import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { canTransitionIssueStatus, statusColumns, statusLabels, type IssueStatusValue } from "@/lib/constants";
import { IssueCard, type IssueCardData } from "@/components/issue-card";

type BoardIssue = IssueCardData & { sortOrder: number };

const columnHints: Record<IssueStatusValue, string> = {
  TODO: "已登记，尚未开始",
  IN_PROGRESS: "正在处理",
  REVIEW: "等待确认",
  DONE: "已完成交付",
  CLOSED: "不再继续处理",
};

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
  const boardStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      total: localIssues.length,
      active: localIssues.filter((issue) => !["DONE", "CLOSED"].includes(issue.status)).length,
      overdue: localIssues.filter((issue) => issue.dueDate && new Date(issue.dueDate) < today && !["DONE", "CLOSED"].includes(issue.status)).length,
      unassigned: localIssues.filter((issue) => !issue.assignee && !["DONE", "CLOSED"].includes(issue.status)).length,
    };
  }, [localIssues]);

  async function onDragEnd(event: DragEndEvent) {
    if (!canMove) return;
    const activeId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : undefined;
    if (!overId) return;

    const status = statusColumns.includes(overId as IssueStatusValue)
      ? (overId as IssueStatusValue)
      : localIssues.find((issue) => issue.id === overId)?.status;
    if (!status) return;
    const activeIssue = localIssues.find((issue) => issue.id === activeId);
    if (!activeIssue) return;
    if (activeIssue.status !== status && !canTransitionIssueStatus(activeIssue.status, status)) {
      setToast({ type: "err", message: `不能从${statusLabels[activeIssue.status]}直接流转到${statusLabels[status]}` });
      return;
    }

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
      <div className="mb-4 grid gap-px overflow-hidden rounded-lg border bg-border text-sm sm:grid-cols-4">
        <div className="bg-card p-3">
          <p className="text-xs text-muted-foreground">当前任务</p>
          <p className="mt-1 text-lg font-semibold">{boardStats.total}</p>
        </div>
        <div className="bg-card p-3">
          <p className="text-xs text-muted-foreground">流转中</p>
          <p className="mt-1 text-lg font-semibold">{boardStats.active}</p>
        </div>
        <div className="bg-card p-3">
          <p className="text-xs text-muted-foreground">已逾期</p>
          <p className={boardStats.overdue ? "mt-1 text-lg font-semibold text-destructive" : "mt-1 text-lg font-semibold"}>{boardStats.overdue}</p>
        </div>
        <div className="bg-card p-3">
          <p className="text-xs text-muted-foreground">未分配</p>
          <p className={boardStats.unassigned ? "mt-1 text-lg font-semibold text-amber-600 dark:text-amber-400" : "mt-1 text-lg font-semibold"}>{boardStats.unassigned}</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
      <div className="mb-3 space-y-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">{statusLabels[status]}</h2>
          <span className="rounded-md border bg-background px-1.5 py-0.5 text-xs font-medium text-muted-foreground">{issues.length}</span>
        </div>
        <p className="text-xs text-muted-foreground">{columnHints[status]}</p>
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
