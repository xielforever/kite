"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";

export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel,
  className,
}: {
  action: (state: { error?: string }, formData: FormData) => Promise<{ error?: string; ok?: boolean }>;
  children: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  className?: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, {});
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [router, state.ok]);

  return (
    <form action={formAction} className={className ?? "space-y-4"}>
      {children}
      <FormError message={state.error} />
      {state.ok ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">已保存</p> : null}
      <SubmitButton pendingText={pendingLabel}>{submitLabel}</SubmitButton>
    </form>
  );
}
