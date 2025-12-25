import { cn } from "@/lib/utils";
import { useSubjectProgress } from "@/hooks/useSubjectProgress";
import { Skeleton } from "@/components/ui/skeleton";

const toPersianNumber = (num: number): string => {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num.toString().replace(/\d/g, (d) => persianDigits[parseInt(d)]);
};

export function SubjectProgress() {
  const { subjects, isLoading } = useSubjectProgress();

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border divide-y divide-border">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-3 w-24 mt-1" />
          </div>
        ))}
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border text-center text-muted-foreground text-sm">
        درسی یافت نشد
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border divide-y divide-border">
      {subjects.map((subject) => {
        const percentage = subject.total > 0 ? Math.round((subject.progress / subject.total) * 100) : 0;
        
        return (
          <div key={subject.name} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-foreground">{subject.name}</span>
              <span className="text-sm text-muted-foreground">
                {toPersianNumber(percentage)}٪
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  percentage === 0 ? "bg-muted" : 
                  percentage < 33 ? "bg-destructive" :
                  percentage < 66 ? "bg-warning" : "bg-success"
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
            
            <p className="text-xs text-muted-foreground mt-1">
              {toPersianNumber(subject.progress)} از {toPersianNumber(subject.total)} سوال
            </p>
          </div>
        );
      })}
    </div>
  );
}
