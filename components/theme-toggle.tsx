"use client";

import { useSyncExternalStore, useCallback } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

function getThemeSnapshot() {
  if (typeof window === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getThemeSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("kite-theme", next ? "dark" : "light");
  }, [dark]);

  return (
    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggle} title={dark ? "切换亮色" : "切换暗色"}>
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
