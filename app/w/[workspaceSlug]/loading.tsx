import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card">
        <div className="border-b p-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="grid gap-px bg-border md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card p-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-1 h-7 w-12" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-5 space-y-4">
            <div className="flex items-start justify-between">
              <Skeleton className="h-11 w-11 rounded-md" />
              <Skeleton className="h-4 w-4" />
            </div>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-48" />
            <div className="border-t pt-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-1 h-6 w-10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
