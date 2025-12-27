import * as React from "react";
import { BottomNavigation } from "./BottomNavigation";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export const AppLayout = React.forwardRef<HTMLDivElement, AppLayoutProps>(
  ({ children, hideNav = false }, ref) => {
    return (
      <div ref={ref} className="min-h-screen bg-background flex flex-col font-vazir">
        <main className={cn("flex-1", !hideNav && "pb-20")}>
          {children}
        </main>
        {!hideNav && <BottomNavigation />}
      </div>
    );
  }
);

AppLayout.displayName = "AppLayout";
