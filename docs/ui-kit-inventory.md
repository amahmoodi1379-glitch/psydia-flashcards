# UI Kit Inventory (Archived for Future Use)

This project was scaffolded with many `shadcn/ui` primitives. Not all of them are used in current product flows.

## Policy

- `src/components/ui/` is treated as a **component kit archive**.
- Product code can import from it when needed.
- Unused checks in CI intentionally ignore this folder to avoid false positives on intentionally preserved primitives.

## Currently intentionally retained but not yet used

Examples include: `alert-dialog`, `calendar`, `carousel`, `chart`, `command`, `drawer`, `form`, `menubar`, `navigation-menu`, `resizable`, `sheet`, `sidebar`, `toggle-group`, and others.

When a primitive is adopted in product flows, no action is needed other than importing it.
