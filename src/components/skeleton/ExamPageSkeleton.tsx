import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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

export function SubjectSelectorSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div 
          key={i} 
          className="bg-card border border-border rounded-xl p-4 animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="w-5 h-5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ResumeCardSkeleton() {
  return (
    <div className="bg-accent/10 border border-accent/30 rounded-2xl p-4 animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-xl bg-accent/20" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

interface ExamPageSkeletonProps {
  showResume?: boolean;
}

export function ExamPageSkeleton({ showResume = false }: ExamPageSkeletonProps) {
  return (
    <div className="px-4 pt-6 pb-8 max-w-md mx-auto">
      {/* Header */}
      <header className="mb-6">
        <Skeleton className="h-7 w-40 mb-2" />
        <Skeleton className="h-5 w-32" />
      </header>

      {/* Resume card */}
      {showResume && (
        <div className="mb-4">
          <ResumeCardSkeleton />
        </div>
      )}

      {/* Daily review */}
      <section className="mb-6">
        <DailyReviewSkeleton />
      </section>

      {/* Bookmarks section */}
      <section className="mb-4">
        <ReviewCardSkeleton />
      </section>

      {/* Wrong questions section */}
      <section className="mb-6">
        <ReviewCardSkeleton />
      </section>

      {/* Subject selection */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <SubjectSelectorSkeleton />
      </section>
    </div>
  );
}
