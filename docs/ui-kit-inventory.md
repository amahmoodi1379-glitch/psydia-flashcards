# UI Kit Inventory (Template Archive)

برای جلوگیری از شلوغی در `src/components/ui/`، پرایمیتیوهای `shadcn/ui` که در مسیرهای محصول استفاده نمی‌شوند به `src/components/ui-archive/` منتقل می‌شوند.

## Policy

- `src/components/ui/` فقط شامل کامپوننت‌های **active** است که import عملی در اپ دارند.
- `src/components/ui-archive/` به‌عنوان **template inventory** نگهداری می‌شود (برای استفاده‌ی احتمالی آینده).
- CI برای unused imports/exports روی کد فعال enforce می‌شود و فولدر archive از این check مستثنا است تا false positive ندهد.

## Migration Rule

- وقتی یک کامپوننت archive واقعاً وارد محصول شد، فایل را از `ui-archive` به `ui` برگردانید و importها را از `@/components/ui/...` انجام دهید.
