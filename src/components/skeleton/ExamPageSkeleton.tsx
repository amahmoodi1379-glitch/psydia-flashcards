import { Skeleton } from "@/components/ui/skeleton";

export function DailyReviewSkeleton() {
  return (
    <div className="bg-card rounded-2xl p-5 border border-border animate-pulse">
      <div className="flex items-start gap-4 mb-4">
        <Skeleton className="w-14 h-14 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 bg-secondary/30 rounded-xl p-3">
          <Skeleton className="h-8 w-12 mx-auto mb-1" />
          <Skeleton className="h-3 w-16 mx-auto" />
        </div>
        <div className="flex-1 bg-secondary/30 rounded-xl p-3">
          <Skeleton className="h-8 w-12 mx-auto mb-1" />
          <Skeleton className="h-3 w-16 mx-auto" />
        </div>
      </div>

      {/* Session size skeleton */}
      <div className="mb-4">
        <Skeleton className="h-3 w-20 mb-2" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="flex-1 h-10 rounded-xl" />
          ))}
        </div>
      </div>

      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}

export function ReviewCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl p-5 border border-border animate-pulse">
      <div className="flex items-start gap-4 mb-4">
        <Skeleton className="w-14 h-14 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}

