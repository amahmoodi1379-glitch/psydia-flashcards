import { cn } from "@/lib/utils";
import { useMasteryData } from "@/hooks/useMasteryData";
import { Skeleton } from "@/components/ui/skeleton";

const getMasteryColor = (mastery: number) => {
  if (mastery === 0) return "bg-muted";
  if (mastery < 25) return "bg-destructive/30";
  if (mastery < 50) return "bg-warning/40";
  if (mastery < 75) return "bg-success/40";
  return "bg-success";
};

export function MasteryHeatmap() {
  const { subtopics, isLoading } = useMasteryData();

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (subtopics.length === 0) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border text-center text-muted-foreground text-sm">
        زیرموضوعی یافت نشد
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <div className="grid grid-cols-4 gap-2">
        {subtopics.map((topic) => (
          <div
            key={topic.name}
            className={cn(
              "aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-colors",
              getMasteryColor(topic.mastery),
              topic.mastery === 0 ? "text-muted-foreground" : "text-foreground"
            )}
          >
            {topic.name}
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
        <span>کم</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 rounded bg-muted" />
          <div className="w-4 h-4 rounded bg-destructive/30" />
          <div className="w-4 h-4 rounded bg-warning/40" />
          <div className="w-4 h-4 rounded bg-success/40" />
          <div className="w-4 h-4 rounded bg-success" />
        </div>
        <span>زیاد</span>
      </div>
    </div>
  );
}
