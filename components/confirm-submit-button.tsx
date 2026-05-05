"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

export function ConfirmSubmitButton({
  children,
  message,
  pendingText = "处理中...",
  ...props
}: ButtonProps & { message: string; pendingText?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      {...props}
      disabled={pending || props.disabled}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {pending ? pendingText : children}
    </Button>
  );
}
