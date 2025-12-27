import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Crown, Zap, Sparkles, Brain, Check, ExternalLink, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

const toPersianNumber = (num: number): string => {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num.toString().replace(/\d/g, (d) => persianDigits[parseInt(d)]);
};

const plans = [
  {
    id: "free",
    name: "رایگان",
    icon: Zap,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    borderColor: "border-muted",
    price: null,
    features: [
      "روزانه ۱۰ تست رایگان",
      "سیستم لایتنر هوشمند",
      "مرور فاصله‌دار خودکار",
    ],
  },
  {
    id: "basic",
    name: "پایه",
    icon: Crown,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    price: { monthly: 50000, quarterly: 120000 },
    features: [
      "تست نامحدود",
      "سیستم لایتنر هوشمند",
      "مرور فاصله‌دار خودکار",
      "سقف مصرف منصفانه",
    ],
  },
  {
    id: "advanced",
    name: "پیشرفته",
    icon: Sparkles,
    color: "text-accent",
    bgColor: "bg-accent/10",
    borderColor: "border-accent/30",
    popular: true,
    price: { monthly: 100000, quarterly: 250000 },
    features: [
      "همه امکانات پلن پایه",
      "بوک‌مارک سوالات",
      "مرور سوالات پراشتباه",
      "گزارش فعالیت تا یک سال",
      "نقشه تسلط سلسله‌مراتبی",
    ],
  },
  {
    id: "smart",
    name: "هوشمند",
    icon: Brain,
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/30",
    comingSoon: true,
    price: null,
    features: [
      "همه امکانات پلن پیشرفته",
      "توضیحات هوش مصنوعی",
      "تحلیل نقاط ضعف",
      "پیشنهاد مسیر مطالعه",
    ],
  },
];

const formatPrice = (price: number) => {
  return toPersianNumber(Math.floor(price / 1000)) + " هزار تومان";
};

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { subscription, isLoading } = useSubscription();

  const currentPlan = subscription?.plan || "free";
  const remainingToday = subscription ? subscription.daily_limit - subscription.today_usage : 10;

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-24 max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">اشتراک ویژه</h1>
          <p className="text-muted-foreground text-sm">
            با اشتراک ویژه، بدون محدودیت تمرین کن
          </p>
        </div>

        {/* Current Status */}
        {user && !isLoading && (
          <Card className="mb-6 border-primary/20 bg-primary/5 animate-fade-in" style={{ animationDelay: "0.05s" }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">اشتراک فعلی شما</p>
                  <p className="font-bold text-foreground">
                    {plans.find(p => p.id === currentPlan)?.name || "رایگان"}
                  </p>
                </div>
                {currentPlan === "free" && (
                  <div className="text-left">
                    <p className="text-sm text-muted-foreground">باقیمانده امروز</p>
                    <p className="font-bold text-primary">
                      {toPersianNumber(Math.max(0, remainingToday))} تست
                    </p>
                  </div>
                )}
                {subscription?.expires_at && (
                  <div className="text-left">
                    <p className="text-sm text-muted-foreground">تا تاریخ</p>
                    <p className="font-bold text-foreground">
                      {new Date(subscription.expires_at).toLocaleDateString("fa-IR")}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plans Grid */}
        <div className="space-y-4">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            const isCurrentPlan = currentPlan === plan.id;
            
            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative overflow-hidden transition-all duration-300 animate-fade-in",
                  plan.borderColor,
                  isCurrentPlan && "ring-2 ring-primary",
                  plan.popular && "shadow-lg"
                )}
                style={{ animationDelay: `${0.1 + index * 0.05}s` }}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-primary to-accent text-white text-xs font-medium py-1 text-center">
                    محبوب‌ترین
                  </div>
                )}
                {plan.comingSoon && (
                  <div className="absolute top-0 left-0 right-0 bg-success text-white text-xs font-medium py-1 text-center">
                    به زودی
                  </div>
                )}
                
                <CardHeader className={cn("pb-2", (plan.popular || plan.comingSoon) && "pt-8")}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", plan.bgColor)}>
                        <Icon className={cn("w-5 h-5", plan.color)} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        {plan.price && (
                          <p className="text-xs text-muted-foreground">
                            ماهانه {formatPrice(plan.price.monthly)}
                          </p>
                        )}
                      </div>
                    </div>
                    {isCurrentPlan && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        فعال
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <ul className="space-y-2 mb-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className={cn("w-4 h-4 shrink-0", plan.color)} />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {plan.price && (
                    <div className="flex gap-2 text-xs text-muted-foreground mb-3 bg-muted/50 rounded-lg p-2">
                      <span>۳ ماهه: {formatPrice(plan.price.quarterly)}</span>
                      <span className="text-success">(صرفه‌جویی {toPersianNumber(Math.round(((plan.price.monthly * 3 - plan.price.quarterly) / (plan.price.monthly * 3)) * 100))}٪)</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Purchase CTA */}
        <Card className="mt-8 border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 animate-fade-in" style={{ animationDelay: "0.35s" }}>
          <CardContent className="p-6 text-center">
            <Bot className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="font-bold text-foreground mb-2">خرید اشتراک</h3>
            <p className="text-sm text-muted-foreground mb-4">
              برای تهیه اشتراک، با VPN خاموش به ربات تلگرام ما مراجعه کنید و از طریق درگاه امن زرین‌پال پرداخت کنید.
            </p>
            <Button 
              className="w-full gap-2"
              onClick={() => {
                window.open("https://t.me/YOUR_BOT", "_blank");
              }}
            >
              <ExternalLink className="w-4 h-4" />
              رفتن به ربات تلگرام
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              پس از پرداخت موفق، اشتراک شما به صورت خودکار فعال می‌شود
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
