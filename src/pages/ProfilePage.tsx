import { AppLayout } from "@/components/layout/AppLayout";
import { User, Settings, BookOpen, Award, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-8 max-w-md mx-auto">
        {/* Profile Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
            <User className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Psychology Student</h1>
          <p className="text-muted-foreground text-sm">Connect Supabase to sign in</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="bg-card rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-foreground">0</p>
            <p className="text-xs text-muted-foreground">Cards Learned</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-foreground">0</p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </div>
          <div className="bg-card rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-foreground">0%</p>
            <p className="text-xs text-muted-foreground">Accuracy</p>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <MenuButton icon={BookOpen} label="My Decks" sublabel="View all topics" />
          <MenuButton icon={Award} label="Achievements" sublabel="Track your progress" />
          <MenuButton icon={Settings} label="Settings" sublabel="App preferences" />
        </div>

        {/* Sign Out */}
        <div className="mt-8 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <Button variant="outline" className="w-full text-muted-foreground" disabled>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

interface MenuButtonProps {
  icon: React.ElementType;
  label: string;
  sublabel: string;
}

function MenuButton({ icon: Icon, label, sublabel }: MenuButtonProps) {
  return (
    <button className="w-full flex items-center gap-4 p-4 bg-card rounded-xl shadow-sm hover:bg-secondary/50 transition-all duration-200 active:scale-[0.98]">
      <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="text-left flex-1">
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      </div>
    </button>
  );
}
