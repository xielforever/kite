import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <Skeleton className="h-5 w-24" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-6 w-8" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-6 w-8" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
