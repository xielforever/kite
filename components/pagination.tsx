"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({ total, pageSize, currentPage }: { total: number; pageSize: number; currentPage: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / pageSize);

  if (totalPages <= 1) return null;

  function goTo(page: number) {
    const next = new URLSearchParams(searchParams.toString());
    if (page > 1) next.set("page", String(page));
    else next.delete("page");
    router.replace(`?${next.toString()}`, { scroll: false });
  }

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-muted-foreground">
        共 {total} 条，第 {currentPage}/{totalPages} 页
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1} onClick={() => goTo(currentPage - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pages.map((page, index) =>
          page === "..." ? (
            <span key={`ellipsis-${index}`} className="px-1 text-muted-foreground">…</span>
          ) : (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => goTo(page)}
            >
              {page}
            </Button>
          ),
        )}
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => goTo(currentPage + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
