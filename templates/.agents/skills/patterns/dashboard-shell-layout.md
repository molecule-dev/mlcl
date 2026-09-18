---
id: dashboard-shell-layout
intent: layout
title: Dashboard shell — sidebar + main must not stack vertically
hooks: [getClassMap]
---

# Dashboard shell (sidebar + main)

**Failure mode:** `<aside>` uses `sticky top-0 h-screen` (or similar full-height in-flow sidebar) as the first child of a **non-flex** page root, followed by a fixed top bar and `<main class="ml-[…]">`. In normal block layout, `<main>` is laid out **below** the full-height aside, so content starts near the bottom of the viewport (often described as “below the header/footer chrome”).

**Correct patterns (pick one):**

1. **Flex row shell** — root `className={cm.cn(cm.pageShell, …)}` or `flex min-h-screen` / `flex h-screen`, sidebar `shrink-0` width, main `flex-1 min-w-0` (see `cm.pageShell` / `cm.pageShellSidebar` / `cm.pageShellContent` in `@molecule/app-ui-tailwind`).
2. **Fixed rail** — sidebar `fixed inset-y-0 left-0 z-30 w-[…] overflow-y-auto`, main keeps matching `ml-[…]` and top padding for any `fixed` top bar.

**Do not** rely on `margin-left` alone to position main next to a **flow** sidebar unless the parent is a horizontal flex (or grid) row.
