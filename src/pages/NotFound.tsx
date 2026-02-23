import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background" dir="rtl">
      <div className="text-center px-6">
        <div className="text-6xl mb-6">🔍</div>
        <h1 className="mb-3 text-5xl font-bold text-foreground">۴۰۴</h1>
        <p className="mb-6 text-lg text-muted-foreground">
          صفحه‌ای که دنبالش بودید پیدا نشد
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          بازگشت به صفحه اصلی
        </a>
      </div>
    </div>
  );
};

export default NotFound;
