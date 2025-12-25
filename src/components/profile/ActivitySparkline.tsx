import { useWeeklyActivity } from "@/hooks/useWeeklyActivity";
import { Skeleton } from "@/components/ui/skeleton";

const toPersianNumber = (num: number): string => {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num.toString().replace(/\d/g, (d) => persianDigits[parseInt(d)]);
};

export function ActivitySparkline() {
  const { activityData, totalWeek, isLoading } = useWeeklyActivity();
  
  const maxValue = Math.max(...activityData.map(d => d.value), 1);

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex items-end justify-between gap-2 h-24 mb-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="flex-1 h-full rounded-t-md" />
          ))}
        </div>
        <Skeleton className="h-4 w-24 mx-auto" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      {/* Sparkline Chart */}
      <div className="flex items-end justify-between gap-2 h-24 mb-3">
        {activityData.map((data, index) => {
          const height = data.value === 0 ? 8 : (data.value / maxValue) * 100;
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-end justify-center h-20">
                <div
                  className="w-full max-w-8 rounded-t-md bg-primary/80 transition-all duration-300"
                  style={{ height: `${height}%`, minHeight: "8px" }}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Day Labels */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {activityData.map((data, index) => (
          <div key={index} className="flex-1 text-center">
            {data.day}
          </div>
        ))}
      </div>
      
      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-center gap-4">
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{toPersianNumber(totalWeek)}</p>
          <p className="text-xs text-muted-foreground">مجموع این هفته</p>
        </div>
      </div>
    </div>
  );
}
