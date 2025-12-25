const toPersianNumber = (num: number): string => {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num.toString().replace(/\d/g, (d) => persianDigits[parseInt(d)]);
};

// Sample data for last 7 days
const activityData = [
  { day: "ش", value: 0 },
  { day: "ی", value: 0 },
  { day: "د", value: 0 },
  { day: "س", value: 0 },
  { day: "چ", value: 0 },
  { day: "پ", value: 0 },
  { day: "ج", value: 0 },
];

const maxValue = Math.max(...activityData.map(d => d.value), 1);

export function ActivitySparkline() {
  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      {/* Sparkline Chart */}
      <div className="flex items-end justify-between gap-2 h-24 mb-3">
        {activityData.map((data, index) => {
          const height = data.value === 0 ? 8 : (data.value / maxValue) * 100;
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-end justify-center h-20">
                <div
                  className="w-full max-w-8 rounded-t-md bg-primary/80 transition-all duration-300"
                  style={{ height: `${height}%`, minHeight: "8px" }}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Day Labels */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {activityData.map((data, index) => (
          <div key={index} className="flex-1 text-center">
            {data.day}
          </div>
        ))}
      </div>
      
      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-center gap-4">
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{toPersianNumber(0)}</p>
          <p className="text-xs text-muted-foreground">مجموع این هفته</p>
        </div>
      </div>
    </div>
  );
}