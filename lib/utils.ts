import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function slugifyAscii(value: string) {
  return value
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function projectKey(value: string) {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 8);
  if (normalized) return normalized;

  const compact = value.trim();
  if (!compact) return "";

  let hash = 0;
  for (const char of compact) {
    hash = (hash * 31 + char.codePointAt(0)!) % 1_679_616;
  }
  return `P${hash.toString(36).toUpperCase().padStart(4, "0")}`.slice(0, 8);
}

export function formatDate(value?: Date | string | null) {
  if (!value) return "未设置";
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(
    typeof value === "string" ? new Date(value) : value,
  );
}

export function formatDateTime(value?: Date | string | null) {
  if (!value) return "未设置";
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "medium",
    hour12: false,
  }).format(typeof value === "string" ? new Date(value) : value);
}
