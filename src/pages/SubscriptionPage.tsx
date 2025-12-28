import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Zap, Sparkles, Brain, Check, AlertTriangle, Loader2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const { subscription, isLoading, refetch } = useSubscription();
  const [searchParams, setSearchParams] = useSearchParams();
  const [purchasingPlan, setPurchasingPlan] = useState<string | null>(null);

  const currentPlan = subscription?.plan || "free";
  const remainingToday = subscription ? subscription.daily_limit - subscription.today_usage : 10;

  // Handle payment result from callback
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const refId = searchParams.get("ref");
    
    if (paymentStatus === "success") {
      toast.success(`پرداخت موفق! کد پیگیری: ${refId}`, { duration: 5000 });
      refetch();
      // Clear query params
      setSearchParams({});
    } else if (paymentStatus === "failed") {
      toast.error("پرداخت ناموفق بود. لطفاً دوباره تلاش کنید.");
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, refetch]);

  const handlePurchase = async (planId: string, duration: "monthly" | "quarterly") => {
    if (!user) {
      toast.error("لطفاً ابتدا وارد حساب خود شوید");
      return;
    }

    setPurchasingPlan(`${planId}-${duration}`);
    
    try {
      const { data, error } = await supabase.functions.invoke("zarinpal-payment?action=create", {
        body: {
          user_id: user.id,
          plan: planId,
          duration: duration,
          callback_type: "miniapp",
        },
      });

      if (error) throw error;
      
      if (data?.payment_url) {
        // Redirect to Zarinpal payment page
        window.location.href = data.payment_url;
      } else {
        throw new Error("No payment URL received");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("خطا در ایجاد درخواست پرداخت. لطفاً دوباره تلاش کنید.");
      setPurchasingPlan(null);
    }
  };

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-24 max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6 animate-fade-in">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">اشتراک ویژه</h1>
          <p className="text-muted-foreground text-sm">
            با اشتراک ویژه، بدون محدودیت تمرین کن
          </p>
        </div>

        {/* VPN Warning */}
        <Alert className="mb-6 border-warning/50 bg-warning/10 animate-fade-in" style={{ animationDelay: "0.05s" }}>
          <AlertTriangle className="h-5 w-5 text-warning" />
          <AlertDescription className="text-warning font-medium">
            توجه مهم: قبل از تهیه اشتراک، حتماً VPN خود را خاموش کنید. در غیر این صورت پرداخت با مشکل مواجه خواهد شد.
          </AlertDescription>
        </Alert>

        {/* Current Status */}
        {user && !isLoading && (
          <Card className="mb-6 border-primary/20 bg-primary/5 animate-fade-in" style={{ animationDelay: "0.1s" }}>
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
            const canPurchase = plan.price && !plan.comingSoon && !isCurrentPlan;
            
            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative overflow-hidden transition-all duration-300 animate-fade-in",
                  plan.borderColor,
                  isCurrentPlan && "ring-2 ring-primary",
                  plan.popular && "shadow-lg"
                )}
                style={{ animationDelay: `${0.15 + index * 0.05}s` }}
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

                  {/* Purchase Buttons */}
                  {canPurchase && user && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handlePurchase(plan.id, "monthly")}
                        disabled={purchasingPlan !== null}
                      >
                        {purchasingPlan === `${plan.id}-monthly` ? (
                          <Loader2 className="w-4 h-4 animate-spin ml-1" />
                        ) : null}
                        ماهانه
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handlePurchase(plan.id, "quarterly")}
                        disabled={purchasingPlan !== null}
                      >
                        {purchasingPlan === `${plan.id}-quarterly` ? (
                          <Loader2 className="w-4 h-4 animate-spin ml-1" />
                        ) : null}
                        ۳ ماهه
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Login Required Message */}
        {!user && (
          <Card className="mt-6 border-2 border-dashed border-muted animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                برای خرید اشتراک، ابتدا وارد حساب کاربری خود شوید
              </p>
            </CardContent>
          </Card>
        )}

        {/* Payment Info */}
        <div className="mt-6 text-center text-xs text-muted-foreground animate-fade-in" style={{ animationDelay: "0.45s" }}>
          <p>پرداخت امن از طریق درگاه زرین‌پال</p>
          <p className="mt-1">پس از پرداخت موفق، اشتراک شما به صورت خودکار فعال می‌شود</p>
        </div>
      </div>
    </AppLayout>
  );
}