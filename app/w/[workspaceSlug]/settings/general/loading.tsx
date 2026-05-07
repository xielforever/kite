import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-32" />
      <div className="max-w-xl rounded-lg border p-6 space-y-4">
        <Skeleton className="h-6 w-24" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-20 w-full" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}
