import * as React from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Folder, FileText } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSubjectHierarchy, Subtopic } from "@/hooks/useSubjectHierarchy";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, toPersianNumber } from "@/lib/utils";

export const SubjectSelector = React.forwardRef<HTMLDivElement>(
  (_props, ref) => {
    const navigate = useNavigate();
    const { subjects, isLoading, error } = useSubjectHierarchy();

    const handleSelectSubtopic = (subtopic: Subtopic) => {
      const qs = new URLSearchParams({
        id: subtopic.id,
        title: subtopic.title,
      });
      navigate(`/subtopic?${qs.toString()}`);
    };

    if (isLoading) {
      return (
        <div ref={ref} className="space-y-3">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      );
    }

    if (error || subjects.length === 0) {
      return (
        <div ref={ref} className="bg-secondary/50 rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground">
            {error || "هیچ درسی یافت نشد"}
          </p>
        </div>
      );
    }

    return (
      <div ref={ref}>
        <Accordion type="multiple" className="space-y-2">
          {subjects.map((subject) => (
            <AccordionItem
              key={subject.id}
              value={subject.id}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/50 [&[data-state=open]]:bg-secondary/30">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-right flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {subject.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {toPersianNumber(subject.questionCount)} سوال
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-2">
                <div className="space-y-1">
                  {/* Topics */}
                  {subject.topics.length > 0 && (
                    <Accordion type="multiple" className="pr-2">
                      {subject.topics.map((topic) => (
                        <AccordionItem
                          key={topic.id}
                          value={topic.id}
                          className="border-0"
                        >
                          <AccordionTrigger className="py-2 px-3 hover:no-underline hover:bg-secondary/50 rounded-lg">
                            <div className="flex items-center gap-2 flex-1">
                              <Folder className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="text-sm text-foreground flex-1 text-right truncate">
                                {topic.title}
                              </span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {toPersianNumber(topic.questionCount)}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pr-4">
                            <div className="space-y-1">
                              {/* Subtopics */}
                              {topic.subtopics.map((subtopic) => (
                                <button
                                  key={subtopic.id}
                                  onClick={() => handleSelectSubtopic(subtopic)}
                                  disabled={subtopic.questionCount === 0}
                                  className={cn(
                                    "w-full text-right px-3 py-2 rounded-lg transition-colors flex items-center gap-2",
                                    "hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                                  )}
                                >
                                  <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                                  <span className="text-sm text-muted-foreground flex-1 truncate">
                                    {subtopic.title}
                                  </span>
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    {toPersianNumber(subtopic.questionCount)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    );
  }
);

SubjectSelector.displayName = "SubjectSelector";
