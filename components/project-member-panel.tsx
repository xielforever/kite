"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addProjectMemberAction, removeProjectMemberFormAction, updateProjectMemberRoleFormAction } from "@/lib/actions";
import { projectRoleLabels, projectRoles, type ProjectRoleValue } from "@/lib/constants";
import { ActionForm } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Candidate = { id: string; name: string; email: string };
type ActionState = { ok?: boolean; error?: string };

function MemberEmailSearch({
  workspaceSlug,
  projectKey,
  value,
  onChange,
}: {
  workspaceSlug: string;
  projectKey: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const query = value.trim();

  useEffect(() => {
    if (query.length < 2) {
      setCandidates([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/w/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectKey)}/member-candidates?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          setCandidates([]);
          return;
        }
        const data = (await response.json()) as { users?: Candidate[] };
        setCandidates(data.users ?? []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setCandidates([]);
        }
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [projectKey, query, workspaceSlug]);

  const showSuggestions = open && query.length >= 2;

  return (
    <div className="relative space-y-2">
      <Label htmlFor="project-member-email">成员邮箱</Label>
      <Input
        id="project-member-email"
        name="email"
        type="email"
        value={value}
        onChange={(event) => {
          onChange(event.currentTarget.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        placeholder="输入姓名或邮箱搜索"
        autoComplete="off"
        required
      />
      {showSuggestions ? (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-card p-1 shadow-md">
          {loading ? <p className="px-2 py-2 text-xs text-muted-foreground">搜索中...</p> : null}
          {!loading && candidates.length
            ? candidates.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  className="flex w-full flex-col rounded-sm px-2 py-2 text-left text-sm hover:bg-muted"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(candidate.email);
                    setOpen(false);
                  }}
                >
                  <span className="font-medium">{candidate.name}</span>
                  <span className="text-xs text-muted-foreground">{candidate.email}</span>
                </button>
              ))
            : null}
          {!loading && !candidates.length ? <p className="px-2 py-2 text-xs text-muted-foreground">没有匹配的未加入用户</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function ProjectMemberRoleSelect({
  workspaceSlug,
  projectKey,
  member,
  currentUserId,
  leadCount,
}: {
  workspaceSlug: string;
  projectKey: string;
  member: { id: string; role: ProjectRoleValue; user: { id: string; name: string } };
  currentUserId: string;
  leadCount: number;
}) {
  const router = useRouter();
  const committedValue = useRef<ProjectRoleValue>(member.role);
  const [value, setValue] = useState<ProjectRoleValue>(member.role);
  const [message, setMessage] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateProjectMemberRoleFormAction.bind(null, workspaceSlug, projectKey, member.id),
    {},
  );
  const isLastLead = member.role === "LEAD" && leadCount <= 1;

  useEffect(() => {
    setValue(member.role);
    committedValue.current = member.role;
  }, [member.role]);

  useEffect(() => {
    if (state.ok) {
      committedValue.current = value;
      setMessage("已保存");
      router.refresh();
      const timer = window.setTimeout(() => setMessage(null), 1600);
      return () => window.clearTimeout(timer);
    }
    if (state.error) {
      setValue(committedValue.current);
      setMessage(state.error);
    }
  }, [router, state.error, state.ok, value]);

  return (
    <form action={formAction} className="space-y-1">
      <select
        name="role"
        value={value}
        disabled={isPending || isLastLead}
        className="h-9 rounded-md border bg-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={`修改 ${member.user.name} 的项目角色`}
        onChange={(event) => {
          const nextValue = event.currentTarget.value as ProjectRoleValue;
          if (member.user.id === currentUserId && member.role === "LEAD" && nextValue !== "LEAD") {
            const confirmed = window.confirm("将自己降级后，你可能立即失去本项目的成员管理权限。确定继续？");
            if (!confirmed) {
              event.currentTarget.value = committedValue.current;
              setValue(committedValue.current);
              return;
            }
          }
          setValue(nextValue);
          setMessage("保存中...");
          event.currentTarget.form?.requestSubmit();
        }}
      >
        {projectRoles.map((role) => (
          <option key={role} value={role}>
            {projectRoleLabels[role]}
          </option>
        ))}
      </select>
      {message ? (
        <p className={state.error ? "max-w-48 text-xs text-destructive" : "text-xs text-muted-foreground"} aria-live="polite">
          {isPending ? "保存中..." : message}
        </p>
      ) : null}
      {isLastLead ? <p className="max-w-48 text-xs text-muted-foreground">最后一位项目负责人不可降级</p> : null}
    </form>
  );
}

function ProjectMemberRemoveButton({
  workspaceSlug,
  projectKey,
  member,
  currentUserId,
  leadCount,
}: {
  workspaceSlug: string;
  projectKey: string;
  member: { id: string; role: ProjectRoleValue; user: { id: string; name: string } };
  currentUserId: string;
  leadCount: number;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    removeProjectMemberFormAction.bind(null, workspaceSlug, projectKey, member.id),
    {},
  );

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [router, state.ok]);

  const isLastLead = member.role === "LEAD" && leadCount <= 1;
  const confirmMessage = member.user.id === currentUserId
    ? "移除自己后，你可能立即失去本项目访问或管理权限。确定继续？"
    : "确定移除该项目成员？";

  return (
    <form
      action={formAction}
      className="mt-3 space-y-1"
      onSubmit={(event) => {
        if (isLastLead || !window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      <Button size="sm" variant="ghost" disabled={isPending || isLastLead}>
        {isPending ? "移除中..." : "移除"}
      </Button>
      {isLastLead ? <p className="text-xs text-muted-foreground">最后一位项目负责人不可移除</p> : null}
      {state.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
    </form>
  );
}

export function ProjectMemberPanel({
  workspaceSlug,
  projectKey,
  members,
  canManage,
  currentUserId,
}: {
  workspaceSlug: string;
  projectKey: string;
  members: { id: string; role: ProjectRoleValue; user: { id: string; name: string; email: string } }[];
  canManage: boolean;
  currentUserId: string;
}) {
  const addProjectMember = addProjectMemberAction.bind(null, workspaceSlug, projectKey);
  const [email, setEmail] = useState("");
  const leadCount = members.filter((member) => member.role === "LEAD").length;

  return (
    <div className="space-y-5">
      <section className="rounded-md border bg-muted/30">
        <div className="flex items-center justify-between gap-3 border-b px-3 py-2.5">
          <div>
            <h3 className="text-sm font-semibold">现有成员</h3>
            <p className="text-xs text-muted-foreground">共 {members.length} 人</p>
          </div>
          <Badge>{canManage ? "可管理" : "只读"}</Badge>
        </div>
        <div className="max-h-80 space-y-3 overflow-y-auto p-3">
          {members.map((member) => (
            <div key={member.id} className="rounded-md border bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{member.user.name}</p>
                  <p className="text-xs text-muted-foreground">{member.user.email}</p>
                </div>
                {canManage ? (
                  <ProjectMemberRoleSelect workspaceSlug={workspaceSlug} projectKey={projectKey} member={member} currentUserId={currentUserId} leadCount={leadCount} />
                ) : (
                  <Badge>{projectRoleLabels[member.role]}</Badge>
                )}
              </div>
              {canManage ? <ProjectMemberRemoveButton workspaceSlug={workspaceSlug} projectKey={projectKey} member={member} currentUserId={currentUserId} leadCount={leadCount} /> : null}
            </div>
          ))}
        </div>
      </section>
      {canManage ? (
        <section className="rounded-md border bg-card p-3">
          <div className="mb-3">
            <h3 className="text-sm font-semibold">添加成员</h3>
            <p className="text-xs text-muted-foreground">通过姓名或邮箱搜索已注册用户。</p>
          </div>
          <ActionForm action={addProjectMember} submitLabel="添加项目成员" onSuccess={() => setEmail("")}>
            <MemberEmailSearch workspaceSlug={workspaceSlug} projectKey={projectKey} value={email} onChange={setEmail} />
            <div className="space-y-2">
              <Label htmlFor="project-member-role">项目角色</Label>
              <select id="project-member-role" name="role" defaultValue="MEMBER" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                {projectRoles.map((role) => (
                  <option key={role} value={role}>
                    {projectRoleLabels[role]}
                  </option>
                ))}
              </select>
            </div>
          </ActionForm>
        </section>
      ) : null}
    </div>
  );
}
