import { Skeleton } from "@/components/ui/skeleton";

export function ProfileHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between mb-6 animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="w-14 h-14 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <Skeleton className="w-12 h-12 rounded-xl" />
    </div>
  );
}

export function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 mb-6 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card rounded-2xl p-4 border border-border">
          <Skeleton className="w-8 h-8 rounded-lg mx-auto mb-2" />
          <Skeleton className="h-6 w-12 mx-auto mb-1" />
          <Skeleton className="h-3 w-16 mx-auto" />
        </div>
      ))}
    </div>
  );
}

export function ActivityChartSkeleton() {
  return (
    <div className="bg-card rounded-2xl p-4 border border-border mb-4 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex justify-between items-end h-16 gap-1">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Skeleton 
            key={i} 
            className="flex-1 rounded-t"
            style={{ height: `${Math.random() * 100}%`, minHeight: "8px" }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Skeleton key={i} className="h-3 w-6" />
        ))}
      </div>
    </div>
  );
}

export function MasteryMapSkeleton() {
  return (
    <div className="bg-card rounded-2xl p-4 border border-border animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="w-5 h-5 rounded" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div className="px-4 pt-6 pb-8 max-w-md mx-auto">
      <ProfileHeaderSkeleton />
      <StatsGridSkeleton />
      <ActivityChartSkeleton />
      <MasteryMapSkeleton />
    </div>
  );
}
