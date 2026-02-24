import { useState } from "react";
import { cn, toPersianNumber } from "@/lib/utils";
import { useHierarchicalMastery } from "@/hooks/useHierarchicalMastery";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, BookOpen, Layers, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

type ViewLevel = "subjects" | "topics" | "subtopics";

interface BreadcrumbItem {
  id: string;
  name: string;
  level: ViewLevel;
}

const getMasteryColor = (mastery: number) => {
  if (mastery === 0) return "bg-muted text-muted-foreground";
  if (mastery < 25) return "bg-destructive/20 text-destructive";
  if (mastery < 50) return "bg-warning/20 text-warning";
  if (mastery < 75) return "bg-success/30 text-success";
  return "bg-success text-success-foreground";
};

const getMasteryLabel = (mastery: number) => {
  if (mastery === 0) return "شروع نشده";
  if (mastery < 25) return "مبتدی";
  if (mastery < 50) return "در حال یادگیری";
  if (mastery < 75) return "متوسط";
  return "مسلط";
};

export function HierarchicalMasteryMap() {
  const { subjects, isLoading } = useHierarchicalMastery();
  const [currentLevel, setCurrentLevel] = useState<ViewLevel>("subjects");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
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

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
  const selectedTopic = selectedSubject?.topics.find((t) => t.id === selectedTopicId);

  const handleSubjectClick = (subject: typeof subjects[0]) => {
    setSelectedSubjectId(subject.id);
    setCurrentLevel("topics");
    setBreadcrumbs([{ id: subject.id, name: subject.name, level: "subjects" }]);
  };

  const handleTopicClick = (topic: NonNullable<typeof selectedSubject>["topics"][0]) => {
    setSelectedTopicId(topic.id);
    setCurrentLevel("subtopics");
    setBreadcrumbs((prev) => [
      ...prev.filter((b) => b.level === "subjects"),
      { id: topic.id, name: topic.name, level: "topics" },
    ]);
  };

  const handleBreadcrumbClick = (item: BreadcrumbItem) => {
    if (item.level === "subjects") {
      setCurrentLevel("topics");
      setSelectedTopicId(null);
      setBreadcrumbs([item]);
    }
  };

  const handleBack = () => {
    if (currentLevel === "subtopics") {
      setCurrentLevel("topics");
      setSelectedTopicId(null);
      setBreadcrumbs((prev) => prev.filter((b) => b.level === "subjects"));
    } else if (currentLevel === "topics") {
      setCurrentLevel("subjects");
      setSelectedSubjectId(null);
      setBreadcrumbs([]);
    }
  };

  const renderItem = (
    item: { id: string; name: string; mastery: number },
    onClick?: () => void,
    icon: React.ReactNode = null
  ) => (
    <button
      key={item.id}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-4 rounded-xl border transition-all",
        "hover:bg-muted/50 active:scale-[0.98]",
        onClick ? "cursor-pointer" : "cursor-default",
        getMasteryColor(item.mastery)
      )}
    >
      {icon}
      <div className="flex-1 text-right">
        <p className="font-medium text-foreground">{item.name}</p>
        <p className="text-xs text-muted-foreground">{getMasteryLabel(item.mastery)}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-left">
          <p className="text-lg font-bold">{toPersianNumber(item.mastery)}٪</p>
        </div>
        {onClick && <ChevronLeft className="w-4 h-4 text-muted-foreground" />}
      </div>
    </button>
  );

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header with breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div className="flex items-center gap-2 p-3 border-b border-border bg-muted/30">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1 text-sm overflow-x-auto">
            <button
              onClick={() => {
                setCurrentLevel("subjects");
                setSelectedSubjectId(null);
                setSelectedTopicId(null);
                setBreadcrumbs([]);
              }}
              className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              همه دروس
            </button>
            {breadcrumbs.map((crumb, i) => (
              <div key={crumb.id} className="flex items-center gap-1">
                <span className="text-muted-foreground">/</span>
                <button
                  onClick={() => handleBreadcrumbClick(crumb)}
                  className={cn(
                    "transition-colors whitespace-nowrap",
                    i === breadcrumbs.length - 1
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        {currentLevel === "subjects" &&
          subjects.map((subject) =>
            renderItem(
              subject,
              () => handleSubjectClick(subject),
              <BookOpen className="w-5 h-5 text-primary" />
            )
          )}

        {currentLevel === "topics" &&
          selectedSubject?.topics.map((topic) =>
            renderItem(
              topic,
              () => handleTopicClick(topic),
              <Layers className="w-5 h-5 text-accent" />
            )
          )}

        {currentLevel === "subtopics" &&
          selectedTopic?.subtopics.map((subtopic) =>
            renderItem(subtopic, undefined, <FileText className="w-5 h-5 text-success" />)
          )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 p-3 border-t border-border text-xs text-muted-foreground bg-muted/20">
        <span>کم</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 rounded bg-muted" />
          <div className="w-4 h-4 rounded bg-destructive/20" />
          <div className="w-4 h-4 rounded bg-warning/20" />
          <div className="w-4 h-4 rounded bg-success/30" />
          <div className="w-4 h-4 rounded bg-success" />
        </div>
        <span>زیاد</span>
      </div>
    </div>
  );
}
