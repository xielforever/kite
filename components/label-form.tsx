"use client";

import { useState } from "react";
import { createLabelAction } from "@/lib/actions";
import { labelPalette } from "@/lib/constants";
import { ActionForm } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LabelForm({ workspaceSlug, projectKey }: { workspaceSlug: string; projectKey: string }) {
  const [color, setColor] = useState(labelPalette[0]);
  const action = createLabelAction.bind(null, workspaceSlug, projectKey);

  return (
    <ActionForm action={action} submitLabel="添加标签">
      <div className="space-y-2">
        <Label htmlFor="label-name">名称</Label>
        <Input id="label-name" name="name" required />
      </div>
      <input type="hidden" name="color" value={color} />
      <div className="flex flex-wrap gap-2">
        {labelPalette.map((item) => (
          <button
            key={item}
            type="button"
            aria-label={`选择颜色 ${item}`}
            className="h-7 w-7 rounded-full border-2"
            style={{ backgroundColor: item, borderColor: color === item ? "#111827" : "transparent" }}
            onClick={() => setColor(item)}
          />
        ))}
      </div>
    </ActionForm>
  );
}
