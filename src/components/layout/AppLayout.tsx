import { ReactNode } from "react";
import { BottomNavigation } from "./BottomNavigation";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export function AppLayout({ children, hideNav = false }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col font-vazir">
      <main className={cn("flex-1", !hideNav && "pb-20")}>
        {children}
      </main>
      {!hideNav && <BottomNavigation />}
    </div>
  );
}