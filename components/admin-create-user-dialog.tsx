"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { adminCreateUserAction } from "@/lib/actions";
import { systemRoleLabels, systemRoles } from "@/lib/constants";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminCreateUserDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} size="sm">
        <UserPlus className="h-4 w-4" />
        新增用户
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>新增用户</DialogTitle>
          <DialogDescription>创建可登录账号。项目访问权限仍需由项目负责人或系统管理员在项目内授予。</DialogDescription>
        </DialogHeader>
        <ActionForm action={adminCreateUserAction} submitLabel="创建用户" pendingLabel="创建中..." onSuccess={() => setOpen(false)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="admin-new-user-name">姓名</Label>
              <Input id="admin-new-user-name" name="name" placeholder="例如：杨逍" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-new-user-email">邮箱</Label>
              <Input id="admin-new-user-email" name="email" type="email" placeholder="user@example.com" required />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="admin-new-user-password">初始密码</Label>
              <Input id="admin-new-user-password" name="password" type="password" minLength={8} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-new-user-role">系统角色</Label>
              <select
                id="admin-new-user-role"
                name="systemRole"
                defaultValue="USER"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                {systemRoles.map((role) => (
                  <option key={role} value={role}>{systemRoleLabels[role]}</option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm">
            <input name="mustChangePassword" type="checkbox" defaultChecked className="mt-1 h-4 w-4" />
            <span>
              <span className="block font-medium">首次登录强制修改密码</span>
              <span className="block text-xs text-muted-foreground">建议对人工创建的账号保持开启。</span>
            </span>
          </label>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
