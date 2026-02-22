# Import Audit Report (`src/`)

Generated from:

- `npm run audit:imports`
- `npm run check:unused`
- `npm run lint:unused`

## 1) Final status of `src/components/ui/*`

Final audit result: **هیچ فایل بدون production import در `src/components/ui` وجود ندارد.**

Production-used set:

- `accordion.tsx`
- `badge.tsx`
- `button.tsx`
- `card.tsx`
- `dialog.tsx`
- `input.tsx`
- `label.tsx`
- `radio-group.tsx`
- `select.tsx`
- `skeleton.tsx`
- `sonner.tsx`
- `switch.tsx`
- `table.tsx`
- `tabs.tsx`
- `textarea.tsx`
- `toast.tsx`
- `toaster.tsx`
- `tooltip.tsx`

## 2) Unused/template components

Unused shadcn templates intentionally خارج از مسیر production در این مسیر نگهداری می‌شوند:

- `src/components/ui-archive/`

در این audit، موردی برای حذف/انتقال جدید از `src/components/ui` پیدا نشد.

## 3) CI guardrail

CI workflow `.github/workflows/unused-check.yml` checkهای زیر را روی PR و push اجرا می‌کند:

1. `npm run lint:unused`
2. `npm run check:unused`
3. `npm run audit:imports`

این guardrail از انباشت مجدد unused imports/exports و drift در import graph جلوگیری می‌کند.
