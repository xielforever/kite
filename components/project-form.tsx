"use client";

import { useEffect, useMemo, useState } from "react";
import { createProjectAction } from "@/lib/actions";
import { projectKey } from "@/lib/utils";
import { ActionForm } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Candidate = { id: string; name: string; email: string };

function LeadEmailSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
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
        const response = await fetch(`/api/admin/user-candidates?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
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
  }, [query]);

  const showSuggestions = open && query.length >= 2;

  return (
    <div className="relative space-y-2">
      <Label htmlFor="new-project-lead-email">项目负责人</Label>
      <Input
        id="new-project-lead-email"
        name="leadEmail"
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
          {!loading && !candidates.length ? <p className="px-2 py-2 text-xs text-muted-foreground">没有匹配的已注册用户</p> : null}
        </div>
      ) : null}
    </div>
  );
}

export function ProjectForm({ workspaceSlug, onSuccess }: { workspaceSlug: string; onSuccess?: () => void }) {
  const [name, setName] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [leadEmail, setLeadEmail] = useState("");
  const defaultKey = useMemo(() => projectKey(name), [name]);
  const action = createProjectAction.bind(null, workspaceSlug);

  useEffect(() => {
    if (!keyTouched) setKeyValue(defaultKey);
  }, [defaultKey, keyTouched]);

  return (
    <ActionForm action={action} submitLabel="创建项目" onSuccess={onSuccess}>
      <div className="space-y-2">
        <Label htmlFor="new-project-name">项目名称</Label>
        <Input id="new-project-name" name="name" value={name} onChange={(event) => setName(event.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-project-key">项目 Key</Label>
        <Input
          id="new-project-key"
          name="key"
          value={keyValue}
          onChange={(event) => {
            setKeyTouched(true);
            setKeyValue(projectKey(event.target.value));
          }}
          placeholder="PL"
          required
        />
      </div>
      <LeadEmailSearch value={leadEmail} onChange={setLeadEmail} />
      <div className="space-y-2">
        <Label htmlFor="new-project-description">描述</Label>
        <Textarea id="new-project-description" name="description" rows={3} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-project-default-due-days">默认截止天数</Label>
        <Input
          id="new-project-default-due-days"
          name="defaultDueDays"
          type="number"
          min={1}
          max={365}
          placeholder="留空则不设默认截止日期"
        />
        <p className="text-xs text-muted-foreground">新建任务时自动设置截止日期为创建后的 N 天</p>
      </div>
    </ActionForm>
  );
}
