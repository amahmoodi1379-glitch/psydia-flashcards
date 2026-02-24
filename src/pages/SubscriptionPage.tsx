import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { Crown, Zap, Sparkles, Brain, Check, X, MessageCircle, CreditCard, Clock, ShieldCheck, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { cn, toPersianNumber } from "@/lib/utils";
import { useState } from "react";

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
    limitations: [
      "بدون بوک‌مارک سوالات",
      "بدون مرور سوالات پراشتباه",
      "فقط آمار ۷ روز اخیر",
      "بدون نقشه تسلط",
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
      "تست نامحدود (بدون محدودیت روزانه)",
      "سیستم لایتنر هوشمند",
      "مرور فاصله‌دار خودکار",
    ],
    limitations: [
      "بدون بوک‌مارک سوالات",
      "بدون مرور سوالات پراشتباه",
      "فقط آمار ۷ روز اخیر",
      "بدون نقشه تسلط",
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
      "تست نامحدود (بدون محدودیت روزانه)",
      "سیستم لایتنر هوشمند",
      "مرور فاصله‌دار خودکار",
      "بوک‌مارک و ذخیره سوالات مهم",
      "مرور سوالات پراشتباه",
      "گزارش فعالیت تا یک سال",
      "نقشه تسلط سلسله‌مراتبی",
    ],
    limitations: [],
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
    limitations: [],
  },
];

const faqs = [
  {
    q: "اشتراک چطور فعال می‌شود؟",
    a: "بعد از پرداخت و ارسال رسید به پشتیبانی در تلگرام، اشتراک شما ظرف چند دقیقه فعال خواهد شد.",
  },
  {
    q: "آیا امکان استرداد وجه وجود دارد؟",
    a: "اگر قبل از استفاده از اشتراک تقاضای لغو بدهید، وجه به‌طور کامل عودت داده می‌شود.",
  },
  {
    q: "اشتراک ۳ ماهه چه فرقی با ماهانه دارد؟",
    a: "اشتراک ۳ ماهه تخفیف ویژه دارد و از نظر امکانات دقیقاً مشابه نسخه ماهانه است.",
  },
  {
    q: "بعد از اتمام اشتراک چه می‌شود؟",
    a: "پلن شما به رایگان برمی‌گردد (۱۰ تست در روز). تاریخچه و پیشرفت شما حفظ می‌شود.",
  },
];

const formatPrice = (price: number) => {
  return toPersianNumber(Math.floor(price / 1000)) + " هزار تومان";
};

export default function SubscriptionPage() {
  const { subscription, isLoading } = useSubscription();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const currentPlan = subscription?.plan || "free";
  const remainingToday = subscription ? subscription.daily_limit - subscription.today_usage : 10;

  const daysRemaining = subscription?.expires_at
    ? Math.max(0, Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <AppLayout>
      <div className="px-4 pt-6 pb-24 max-w-md mx-auto" dir="rtl">
        {/* Header */}
        <div className="text-center mb-6 animate-fade-in">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">اشتراک ویژه</h1>
          <p className="text-muted-foreground text-sm">
            با اشتراک ویژه، بدون محدودیت تمرین کن و به همه امکانات دسترسی داشته باش
          </p>
        </div>

        {/* Current Status */}
        {!isLoading && (
          <Card className="mb-6 border-primary/20 bg-primary/5 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs text-muted-foreground">اشتراک فعلی</p>
                  <p className="font-bold text-lg text-foreground">
                    {plans.find(p => p.id === currentPlan)?.name || "رایگان"}
                  </p>
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                  فعال
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm">
                {currentPlan === "free" && (
                  <div className="flex items-center gap-1.5 bg-background/50 rounded-lg px-3 py-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span className="text-muted-foreground">باقیمانده امروز:</span>
                    <span className="font-bold text-primary">{toPersianNumber(Math.max(0, remainingToday))} تست</span>
                  </div>
                )}
                {daysRemaining !== null && daysRemaining > 0 && (
                  <div className="flex items-center gap-1.5 bg-background/50 rounded-lg px-3 py-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span className="text-muted-foreground">اعتبار:</span>
                    <span className="font-bold text-foreground">
                      {toPersianNumber(daysRemaining)} روز ({new Date(subscription!.expires_at!).toLocaleDateString("fa-IR")})
                    </span>
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
                        {plan.price ? (
                          <p className="text-xs text-muted-foreground">
                            ماهانه {formatPrice(plan.price.monthly)}
                          </p>
                        ) : plan.comingSoon ? (
                          <p className="text-xs text-muted-foreground">قیمت متعاقباً اعلام می‌شود</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">بدون هزینه</p>
                        )}
                      </div>
                    </div>
                    {isCurrentPlan && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        پلن فعلی شما
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <ul className="space-y-1.5 mb-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className={cn("w-4 h-4 shrink-0", plan.color)} />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                    {plan.limitations.map((limitation, i) => (
                      <li key={`lim-${i}`} className="flex items-center gap-2 text-sm">
                        <X className="w-4 h-4 shrink-0 text-muted-foreground/50" />
                        <span className="text-muted-foreground/70">{limitation}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {plan.price && (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">ماهانه:</span>
                        <span className="font-bold text-foreground">{formatPrice(plan.price.monthly)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">۳ ماهه:</span>
                          <Badge variant="secondary" className="bg-success/10 text-success text-xs px-1.5 py-0">
                            {toPersianNumber(Math.round(((plan.price.monthly * 3 - plan.price.quarterly) / (plan.price.monthly * 3)) * 100))}٪ تخفیف
                          </Badge>
                        </div>
                        <span className="font-bold text-foreground">{formatPrice(plan.price.quarterly)}</span>
                      </div>
                    </div>
                  )}

                  {plan.price && !isCurrentPlan && !plan.comingSoon && (
                    <Button asChild className="w-full mt-3 gap-2" variant={plan.popular ? "default" : "outline"}>
                      <a href="https://t.me/psynex_op" target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="w-4 h-4" />
                        خرید پلن {plan.name}
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* How to Purchase - Step by Step */}
        <Card className="mt-6 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              نحوه خرید اشتراک
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">۱</span>
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">پلن مورد نظر خود را انتخاب کنید</p>
                  <p className="text-xs text-muted-foreground">پلن پایه یا پیشرفته، ماهانه یا ۳ ماهه</p>
                </div>
              </div>
              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">۲</span>
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">به پشتیبانی در تلگرام پیام دهید</p>
                  <p className="text-xs text-muted-foreground">
                    آیدی پشتیبانی: <span className="font-mono font-bold text-foreground" dir="ltr">@psynex_op</span>
                  </p>
                </div>
              </div>
              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">۳</span>
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">پرداخت و ارسال رسید</p>
                  <p className="text-xs text-muted-foreground">پرداخت از طریق کارت به کارت — شماره کارت توسط پشتیبانی اعلام می‌شود</p>
                </div>
              </div>
              {/* Step 4 */}
              <div className="flex gap-3">
                <div className="w-7 h-7 bg-success/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-success" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">فعال‌سازی فوری</p>
                  <p className="text-xs text-muted-foreground">اشتراک شما ظرف چند دقیقه فعال می‌شود</p>
                </div>
              </div>
            </div>

            <Button asChild className="w-full mt-4 gap-2" size="lg">
              <a href="https://t.me/psynex_op" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-5 h-5" />
                پیام به پشتیبانی در تلگرام
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <div className="mt-6 animate-fade-in" style={{ animationDelay: "0.5s" }}>
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold text-foreground text-sm">سوالات متداول</h2>
          </div>
          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-card rounded-xl border border-border overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-3 text-right"
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                >
                  <span className="text-sm font-medium text-foreground">{faq.q}</span>
                  {openFaqIndex === index ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </button>
                {openFaqIndex === index && (
                  <div className="px-3 pb-3 animate-fade-in">
                    <p className="text-xs text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
