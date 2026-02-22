# UI Kit Inventory (Template Archive)

برای جلوگیری از شلوغی در `src/components/ui/`، پرایمیتیوهای `shadcn/ui` که در مسیرهای محصول استفاده نمی‌شوند به `src/components/ui-archive/` منتقل می‌شوند.

## Policy

- `src/components/ui/` فقط شامل کامپوننت‌های **production-active** است که import عملی در اپ دارند.
- `src/components/ui-archive/` به‌عنوان **template inventory** نگهداری می‌شود (برای استفاده‌ی احتمالی آینده).
- CI برای unused imports/exports روی کد active enforce می‌شود و فولدر archive از این check مستثنا است تا false positive ندهد.

## Production-Active UI (`src/components/ui`)

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

## Template Inventory (`src/components/ui-archive`)

- `alert-dialog.tsx`
- `alert.tsx`
- `aspect-ratio.tsx`
- `avatar.tsx`
- `breadcrumb.tsx`
- `calendar.tsx`
- `carousel.tsx`
- `chart.tsx`
- `checkbox.tsx`
- `collapsible.tsx`
- `command.tsx`
- `context-menu.tsx`
- `drawer.tsx`
- `dropdown-menu.tsx`
- `form.tsx`
- `hover-card.tsx`
- `input-otp.tsx`
- `menubar.tsx`
- `navigation-menu.tsx`
- `pagination.tsx`
- `popover.tsx`
- `progress.tsx`
- `resizable.tsx`
- `scroll-area.tsx`
- `separator.tsx`
- `sheet.tsx`
- `sidebar.tsx`
- `slider.tsx`
- `toggle-group.tsx`
- `toggle.tsx`
- `use-toast.ts`

## Migration Rule

- وقتی یک کامپوننت archive واقعاً وارد محصول شد، فایل را از `ui-archive` به `ui` برگردانید و importها را از `@/components/ui/...` انجام دهید.
