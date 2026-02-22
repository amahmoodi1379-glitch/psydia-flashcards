import { Skeleton } from "@/components/ui/skeleton";

function QuestionCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Question stem skeleton */}
      <div className="bg-card rounded-2xl p-5 border border-border animate-pulse">
        <Skeleton className="h-5 w-full mb-2" />
        <Skeleton className="h-5 w-4/5 mb-2" />
        <Skeleton className="h-5 w-3/5" />
      </div>

      {/* Choices skeleton */}
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i} 
            className="w-full p-4 rounded-xl bg-secondary/50 animate-pulse"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <Skeleton className="h-5 w-full" />
          </div>
        ))}
      </div>

      {/* Don't know button skeleton */}
      <div className="w-full p-3 rounded-xl border-2 border-dashed border-muted-foreground/20 animate-pulse">
        <Skeleton className="h-5 w-20 mx-auto" />
      </div>
    </div>
  );
}

export function ReviewPageSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header skeleton */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="text-center space-y-1">
          <Skeleton className="h-3 w-16 mx-auto" />
          <Skeleton className="h-4 w-24 mx-auto" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="w-10 h-10 rounded-lg" />
        </div>
      </header>

      {/* Progress bar skeleton */}
      <div className="h-1 bg-secondary">
        <Skeleton className="h-full w-1/3" />
      </div>

      {/* Question area */}
      <div className="flex-1 flex flex-col px-4 py-6">
        <QuestionCardSkeleton />
      </div>
    </div>
  );
}
