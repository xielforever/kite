"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { adminUpdateUserRoleAction } from "@/lib/actions";
import { systemRoleLabels, systemRoles, type SystemRoleValue } from "@/lib/constants";

type ActionState = {
  ok?: boolean;
  error?: string;
};

export function AdminRoleSelect({
  userId,
  userName,
  value: initialValue,
  disabled,
}: {
  userId: string;
  userName: string;
  value: SystemRoleValue;
  disabled?: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const committedValue = useRef<SystemRoleValue>(initialValue);
  const [value, setValue] = useState<SystemRoleValue>(initialValue);
  const [message, setMessage] = useState<string | null>(disabled ? "当前账号" : null);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(adminUpdateUserRoleAction, {});

  useEffect(() => {
    setValue(initialValue);
    committedValue.current = initialValue;
  }, [initialValue]);

  useEffect(() => {
    if (disabled) return;
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
  }, [disabled, router, state.error, state.ok, value]);

  return (
    <form ref={formRef} action={formAction} className="space-y-1.5">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="systemRole"
        value={value}
        disabled={disabled || isPending}
        className="h-8 w-32 rounded-md border bg-background px-2 text-xs font-medium shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={`修改 ${userName} 的系统角色`}
        onChange={(event) => {
          setValue(event.currentTarget.value as SystemRoleValue);
          setMessage("保存中...");
          event.currentTarget.form?.requestSubmit();
        }}
      >
        {systemRoles.map((role) => (
          <option key={role} value={role}>{systemRoleLabels[role]}</option>
        ))}
      </select>
      {message ? (
        <p className={state.error ? "text-xs text-destructive" : "text-xs text-muted-foreground"} aria-live="polite">
          {isPending ? "保存中..." : message}
        </p>
      ) : null}
    </form>
  );
}
