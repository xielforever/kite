"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Database, Globe2, KeyRound, ServerCog, UserRound } from "lucide-react";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SetupActionState } from "@/lib/setup";

type SetupAction = (state: SetupActionState, formData: FormData) => Promise<SetupActionState>;

type DbFields = {
  host: string;
  port: string;
  username: string;
  password: string;
  database: string;
};

type AdminFields = {
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  appUrl: string;
  workspaceName: string;
  workspaceSlug: string;
};

function StepHeader({
  index,
  title,
  active,
  complete,
}: {
  index: number;
  title: string;
  active: boolean;
  complete: boolean;
}) {
  const Icon = complete ? CheckCircle2 : Circle;
  return (
    <div className={active ? "flex items-center gap-2 text-sm font-medium text-foreground" : "flex items-center gap-2 text-sm text-muted-foreground"}>
      <Icon className={complete ? "h-4 w-4 text-emerald-600" : "h-4 w-4"} />
      <span>
        {index}. {title}
      </span>
    </div>
  );
}

function HiddenDbFields({ db }: { db: DbFields }) {
  return (
    <>
      <input type="hidden" name="host" value={db.host} />
      <input type="hidden" name="port" value={db.port} />
      <input type="hidden" name="username" value={db.username} />
      <input type="hidden" name="password" value={db.password} />
      <input type="hidden" name="database" value={db.database} />
    </>
  );
}

export function SetupForm({
  validateAction,
  migrateAction,
  createAdminAction,
  defaultValues,
}: {
  validateAction: SetupAction;
  migrateAction: SetupAction;
  createAdminAction: SetupAction;
  defaultValues?: DbFields & { appUrl?: string };
}) {
  const [step, setStep] = useState(1);
  const [db, setDb] = useState<DbFields>({
    host: defaultValues?.host || "",
    port: defaultValues?.port || "5432",
    username: defaultValues?.username || "",
    password: defaultValues?.password || "",
    database: defaultValues?.database || "",
  });
  const [admin, setAdmin] = useState<AdminFields>({
    adminName: "Super Admin",
    adminEmail: "admin@example.com",
    adminPassword: "",
    appUrl: defaultValues?.appUrl || "",
    workspaceName: "默认工作区",
    workspaceSlug: "default",
  });

  const [validateState, validateFormAction] = useActionState(validateAction, {});
  const [migrateState, migrateFormAction] = useActionState(migrateAction, {});
  const [adminState, adminFormAction] = useActionState(createAdminAction, {});

  useEffect(() => {
    if (validateState.ok) setStep((current) => Math.max(current, 2));
  }, [validateState.ok]);

  useEffect(() => {
    if (migrateState.ok) setStep((current) => Math.max(current, 3));
  }, [migrateState.ok]);

  useEffect(() => {
    setAdmin((current) => {
      if (current.appUrl || typeof window === "undefined") return current;
      return { ...current, appUrl: window.location.origin };
    });
  }, []);

  const canMigrate = Boolean(validateState.ok);
  const canCreateAdmin = Boolean(migrateState.ok);
  const setupComplete = Boolean(adminState.ok);
  const maskedConnection = useMemo(() => {
    if (!db.host || !db.database) return "";
    return `${db.username || "user"}@${db.host}:${db.port || "5432"}/${db.database}`;
  }, [db]);

  return (
    <div className="space-y-5">
      <div className="grid gap-2 rounded-md border bg-muted/40 p-3 sm:grid-cols-3">
        <StepHeader index={1} title="验证数据源" active={step === 1} complete={Boolean(validateState.ok)} />
        <StepHeader index={2} title="执行迁移" active={step === 2} complete={Boolean(migrateState.ok)} />
        <StepHeader index={3} title="创建管理员" active={step === 3} complete={Boolean(adminState.ok)} />
      </div>

      {setupComplete ? (
        <div className="rounded-md border bg-muted/60 px-3 py-3 text-sm text-muted-foreground">
          初始化已完成。当前页面已锁定，请重启服务后进入登录页。
        </div>
      ) : null}

      <form action={validateFormAction} className={step === 1 && !setupComplete ? "space-y-4" : "hidden"}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="host" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              PG 地址
            </Label>
            <Input id="host" name="host" value={db.host} onChange={(event) => setDb({ ...db, host: event.target.value })} placeholder="127.0.0.1" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="port">端口</Label>
            <Input id="port" name="port" inputMode="numeric" value={db.port} onChange={(event) => setDb({ ...db, port: event.target.value })} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input id="username" name="username" value={db.username} onChange={(event) => setDb({ ...db, username: event.target.value })} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              密码
            </Label>
            <Input id="password" name="password" type="password" value={db.password} onChange={(event) => setDb({ ...db, password: event.target.value })} required />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="database" className="flex items-center gap-2">
              <ServerCog className="h-4 w-4" />
              数据库
            </Label>
            <Input id="database" name="database" value={db.database} onChange={(event) => setDb({ ...db, database: event.target.value })} required />
          </div>
        </div>

        <FormError message={validateState.error} />
        {validateState.ok ? <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">数据源验证通过：{maskedConnection}</p> : null}
        <SubmitButton pendingText="正在验证..." className="w-full">
          验证数据源
        </SubmitButton>
      </form>

      <form action={migrateFormAction} className={step === 2 && !setupComplete ? "space-y-4" : "hidden"}>
        <HiddenDbFields db={db} />
        <div className="rounded-md border bg-background px-3 py-3 text-sm text-muted-foreground">
          将对 <span className="font-medium text-foreground">{maskedConnection}</span> 执行 `prisma migrate deploy`。请确认该数据库已手动创建，且账号有建表和建索引权限。
        </div>
        <FormError message={migrateState.error} />
        {migrateState.ok ? <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">迁移已完成，可以创建 superAdmin。</p> : null}
        <div className="flex gap-2">
          <button type="button" className="h-9 rounded-md border px-3 text-sm" onClick={() => setStep(1)}>
            返回修改
          </button>
          <SubmitButton pendingText="正在迁移..." className="flex-1">
            执行迁移
          </SubmitButton>
        </div>
      </form>

      <form action={adminFormAction} className={step === 3 ? "space-y-4" : "hidden"}>
        <HiddenDbFields db={db} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="adminName" className="flex items-center gap-2">
              <UserRound className="h-4 w-4" />
              管理员姓名
            </Label>
            <Input id="adminName" name="adminName" value={admin.adminName} onChange={(event) => setAdmin({ ...admin, adminName: event.target.value })} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminEmail">管理员邮箱</Label>
            <Input id="adminEmail" name="adminEmail" type="email" value={admin.adminEmail} onChange={(event) => setAdmin({ ...admin, adminEmail: event.target.value })} required />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="adminPassword">初始密码</Label>
            <Input id="adminPassword" name="adminPassword" type="password" minLength={8} value={admin.adminPassword} onChange={(event) => setAdmin({ ...admin, adminPassword: event.target.value })} required />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="appUrl" className="flex items-center gap-2">
              <Globe2 className="h-4 w-4" />
              访问地址
            </Label>
            <Input
              id="appUrl"
              name="appUrl"
              type="url"
              value={admin.appUrl}
              onChange={(event) => setAdmin({ ...admin, appUrl: event.target.value })}
              placeholder="例如：http://192.168.1.10:3000"
              required
            />
            <p className="text-xs text-muted-foreground">会写入 AUTH_URL，远程访问时不要使用访问者本机的 localhost。</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workspaceName">默认工作区</Label>
            <Input id="workspaceName" name="workspaceName" value={admin.workspaceName} onChange={(event) => setAdmin({ ...admin, workspaceName: event.target.value })} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workspaceSlug">工作区 slug</Label>
            <Input id="workspaceSlug" name="workspaceSlug" pattern="[a-z0-9-]+" value={admin.workspaceSlug} onChange={(event) => setAdmin({ ...admin, workspaceSlug: event.target.value })} required />
          </div>
        </div>

        <FormError message={adminState.error} />
        {adminState.ok ? (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
            <p className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              初始化完成
            </p>
            <p className="mt-1 text-emerald-700 dark:text-emerald-200">{adminState.restartHint}</p>
          </div>
        ) : null}
        <div className="flex gap-2">
          <button type="button" className="h-9 rounded-md border px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setStep(2)} disabled={!canMigrate || setupComplete}>
            返回迁移
          </button>
          <SubmitButton pendingText="正在创建..." className="flex-1" disabled={!canCreateAdmin || setupComplete}>
            创建 superAdmin
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
