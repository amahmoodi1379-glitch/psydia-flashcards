import { cn } from "@/lib/utils";

const toPersianNumber = (num: number): string => {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num.toString().replace(/\d/g, (d) => persianDigits[parseInt(d)]);
};

// Sample subjects with progress
const subjects = [
  { name: "روانشناسی رشد", progress: 0, total: 50 },
  { name: "روانشناسی یادگیری", progress: 0, total: 45 },
  { name: "روانشناسی شخصیت", progress: 0, total: 60 },
  { name: "آسیب‌شناسی روانی", progress: 0, total: 80 },
  { name: "روانشناسی اجتماعی", progress: 0, total: 40 },
];

export function SubjectProgress() {
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