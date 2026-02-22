# Import Audit Report (`src/`)

Generated from:

- `npm run audit:imports`
- `npm run check:unused`
- `npm run lint:unused`

## 1) Final status of `src/components/ui/*`

All files currently داخل `src/components/ui/` import عملی در اپ دارند (production-used).

Active set:

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

## 2) Truly unused/template components

Unused shadcn templates are intentionally kept خارج از مسیر production در:

- `src/components/ui-archive/`

این پوشه inventory/template است و در runtime اپ import نمی‌شود مگر اینکه کامپوننتی به مسیر `src/components/ui/` برگردانده شود.

## 3) CI guardrail

CI workflow `.github/workflows/unused-check.yml` now runs:

1. `npm run lint:unused`
2. `npm run check:unused`
3. `npm run audit:imports`

So unused imports/exports + unreachable file drift are blocked in PR/push checks.
