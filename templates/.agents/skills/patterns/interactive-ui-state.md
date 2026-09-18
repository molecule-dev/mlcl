---
id: interactive-ui-state
intent: ui-state
title: Local UI state — tabs, toggles, filters, modals
hooks: [useState]
---

# Interactive local state

**When to use:** any visual that SHOULD respond to clicks even without backend calls: active tab, open modal, filter chip selection, password visibility toggle, expand/collapse.

```tsx
import { useState } from 'react'

export function FilterBar() {
  const [active, setActive] = useState<'all' | 'published' | 'draft'>('all')
  return (
    <div role="tablist">
      {(['all', 'published', 'draft'] as const).map((opt) => (
        <button
          key={opt}
          role="tab"
          aria-selected={active === opt}
          onClick={() => setActive(opt)}
          className={active === opt ? '...active classes...' : '...inactive classes...'}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
```

For modals / drawers / dropdowns:

```tsx
const [open, setOpen] = useState(false)
<button onClick={() => setOpen(true)}>Open</button>
{open && <Modal onClose={() => setOpen(false)}>...</Modal>}
```

**Anti-patterns:**

- Don't leave a "Filter: All | Published | Draft" UI unwired — users will click and nothing happens.
- Don't forget `aria-selected` / `role="tab"` / `aria-expanded` — accessibility matters.
