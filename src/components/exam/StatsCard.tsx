import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sublabel?: string;
  variant?: "default" | "primary" | "accent";
}

export function StatsCard({
  icon: Icon,
  label,
  value,
  sublabel,
  variant = "default",
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-5 shadow-md transition-all duration-300 hover:shadow-lg animate-fade-in",
        variant === "default" && "bg-card",
        variant === "primary" && "bg-primary text-primary-foreground",
        variant === "accent" && "bg-secondary"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p
            className={cn(
              "text-sm font-medium",
              variant === "default" && "text-muted-foreground",
              variant === "primary" && "text-primary-foreground/80",
              variant === "accent" && "text-secondary-foreground/70"
            )}
          >
            {label}
          </p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {sublabel && (
            <p
              className={cn(
                "text-xs",
                variant === "default" && "text-muted-foreground",
                variant === "primary" && "text-primary-foreground/70",
                variant === "accent" && "text-secondary-foreground/60"
              )}
            >
              {sublabel}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl",
            variant === "default" && "bg-secondary",
            variant === "primary" && "bg-primary-foreground/20",
            variant === "accent" && "bg-primary/10"
          )}
        >
          <Icon
            className={cn(
              "w-6 h-6",
              variant === "default" && "text-primary",
              variant === "primary" && "text-primary-foreground",
              variant === "accent" && "text-primary"
            )}
          />
        </div>
      </div>
    </div>
  );
}
