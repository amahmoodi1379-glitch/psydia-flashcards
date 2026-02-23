import { AppLayout } from "@/components/layout/AppLayout";
import { Trophy, Medal, Crown, TrendingUp, Target } from "lucide-react";
import { useState } from "react";
import { cn, toPersianNumber } from "@/lib/utils";
import { useLeaderboard, LeaderboardEntry } from "@/hooks/useLeaderboard";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { getAvatarEmoji } from "@/lib/avatars";

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Crown className="w-5 h-5 text-yellow-400" />;
    case 2:
      return <Medal className="w-5 h-5 text-gray-300" />;
    case 3:
      return <Medal className="w-5 h-5 text-amber-600" />;
    default:
      return null;
  }
}

function getRankBgClass(rank: number): string {
  switch (rank) {
    case 1:
      return "bg-gradient-to-l from-yellow-500/20 to-transparent border-yellow-500/30";
    case 2:
      return "bg-gradient-to-l from-gray-400/20 to-transparent border-gray-400/30";
    case 3:
      return "bg-gradient-to-l from-amber-600/20 to-transparent border-amber-600/30";
    default:
      return "border-border";
  }
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-card rounded-xl p-4 border border-border flex items-center gap-4">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

function LeaderboardItem({ 
  entry, 
  isCurrentUser 
}: { 
  entry: LeaderboardEntry; 
  isCurrentUser: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-card rounded-xl p-4 border flex items-center gap-3 transition-all",
        getRankBgClass(entry.rank),
        isCurrentUser && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      {/* Rank */}
      <div className="w-8 flex items-center justify-center">
        {getRankIcon(entry.rank) || (
          <span className="text-lg font-bold text-muted-foreground">
            {toPersianNumber(entry.rank)}
          </span>
        )}
      </div>

      {/* Avatar */}
      <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-xl">
        {getAvatarEmoji(entry.avatar_url)}
      </div>

      {/* Name & Stats */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-semibold truncate",
          isCurrentUser ? "text-primary" : "text-foreground"
        )}>
          {entry.display_name}
          {isCurrentUser && " (شما)"}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{toPersianNumber(entry.correct_count)} درست</span>
          <span>•</span>
          <span>{toPersianNumber(entry.accuracy)}٪ دقت</span>
        </div>
      </div>

      {/* Score */}
      <div className="text-left">
        <p className="text-lg font-bold text-primary">
          {toPersianNumber(entry.score)}
        </p>
        <p className="text-xs text-muted-foreground">امتیاز</p>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const { user } = useAuth();
  const { leaderboard, userRank, isLoading } = useLeaderboard(period);

  const isUserInTop = leaderboard.some((e) => e.user_id === user?.id);

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-8 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 animate-fade-in">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">لیدربورد</h1>
            <p className="text-sm text-muted-foreground">رتبه‌بندی کاربران</p>
          </div>
        </div>

        {/* Period Toggle */}
        <div 
          className="flex gap-2 mb-6 p-1 bg-secondary rounded-xl animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          <button
            onClick={() => setPeriod("weekly")}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all",
              period === "weekly"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            هفتگی
          </button>
          <button
            onClick={() => setPeriod("monthly")}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all",
              period === "monthly"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            ماهانه
          </button>
        </div>

        {/* User's own rank if not in top */}
        {userRank && !isUserInTop && !isLoading && (
          <div 
            className="mb-4 animate-fade-in"
            style={{ animationDelay: "0.15s" }}
          >
            <p className="text-sm text-muted-foreground mb-2">رتبه شما</p>
            <div className="bg-card rounded-xl p-4 border border-primary/30 flex items-center gap-3">
              <div className="w-8 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">
                  {toPersianNumber(userRank.rank)}
                </span>
              </div>
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-primary">شما</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{toPersianNumber(userRank.correct_count)} درست</span>
                  <span>•</span>
                  <span>{toPersianNumber(userRank.accuracy)}٪ دقت</span>
                </div>
              </div>
              <div className="text-left">
                <p className="text-lg font-bold text-primary">
                  {toPersianNumber(userRank.score)}
                </p>
                <p className="text-xs text-muted-foreground">امتیاز</p>
              </div>
            </div>
          </div>
        )}

        {/* Scoring Info */}
        <div 
          className="mb-4 p-3 bg-secondary/50 rounded-xl text-xs text-muted-foreground animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="font-medium">نحوه امتیازدهی:</span>
          </div>
          <p>هر جواب درست = ۱۰ امتیاز + بونوس دقت (۱۵ تا ۵۰ امتیاز)</p>
        </div>

        {/* Leaderboard List */}
        <div 
          className="space-y-3 animate-fade-in"
          style={{ animationDelay: "0.25s" }}
        >
          {isLoading ? (
            <LeaderboardSkeleton />
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">
                هنوز کسی در این دوره فعالیتی نداشته
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                اولین نفری باش که وارد لیدربورد میشه!
              </p>
            </div>
          ) : (
            leaderboard.map((entry) => (
              <LeaderboardItem
                key={entry.user_id}
                entry={entry}
                isCurrentUser={entry.user_id === user?.id}
              />
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
