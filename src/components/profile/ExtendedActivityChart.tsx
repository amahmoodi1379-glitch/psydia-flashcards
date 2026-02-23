import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useExtendedActivity, type ActivityRange } from "@/hooks/useExtendedActivity";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";
import { toPersianNumber } from "@/lib/utils";

const rangeLabels: Record<ActivityRange, string> = {
  30: "ماهانه",
  90: "۳ ماهه",
  180: "۶ ماهه",
  365: "سالانه",
};

export function ExtendedActivityChart() {
  const [selectedRange, setSelectedRange] = useState<ActivityRange>(30);
  const { activityData, totalQuestions, activeDays, avgPerDay, isLoading } = useExtendedActivity(selectedRange);

  const chartData = activityData.map((item) => ({
    date: new Date(item.activity_date).toLocaleDateString("fa-IR", { 
      month: "short", 
      day: "numeric" 
    }),
    count: Number(item.activity_count),
  }));

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        {/* Range Selector */}
        <Tabs 
          value={String(selectedRange)} 
          onValueChange={(val) => setSelectedRange(Number(val) as ActivityRange)}
          className="mb-4"
        >
          <TabsList className="grid grid-cols-4 w-full">
            {(Object.keys(rangeLabels) as unknown as ActivityRange[]).map((range) => (
              <TabsTrigger key={range} value={String(range)} className="text-xs">
                {rangeLabels[range]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-secondary/50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-foreground">
                  {toPersianNumber(totalQuestions)}
                </p>
                <p className="text-xs text-muted-foreground">مجموع سوالات</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-foreground">
                  {toPersianNumber(activeDays)}
                </p>
                <p className="text-xs text-muted-foreground">روز فعال</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-foreground">
                  {toPersianNumber(avgPerDay)}
                </p>
                <p className="text-xs text-muted-foreground">میانگین روزانه</p>
              </div>
            </div>

            {/* Chart */}
            {chartData.length > 0 ? (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number) => [toPersianNumber(value), "سوال"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#colorActivity)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                در این بازه فعالیتی ثبت نشده است
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}