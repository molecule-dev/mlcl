---
id: card-actions
intent: list-fetch
title: Wire Edit / Delete / Favorite / More buttons on cards
hooks: [Link, useHttpClient, useState, useOptimisticValue, useQuery]
---

# In-card action buttons

**When to use:** list items with inline actions (Edit, Delete, Favorite, More menu). These are NOT the main card click — they're nested inside it.

**Rules:**

- **Edit** → `<Link to={`/posts/${item.id}/edit`}>` with `onClick={e => e.stopPropagation()}` so the outer card navigation doesn't fire.
- **Delete** → onClick calls `http.delete(`/api/items/${item.id}`)`, removes the item from local state, shows confirm prompt first.
- **Favorite / Star / Bookmark** → render `useOptimisticValue` and save the desired value in its `commit`. Use the executable recipe below for a server-owned flag and count.
- **More / ... menu** → toggles a local open state that renders a dropdown; clicking outside closes it.

Keep action buttons beside the card's navigation link. Mount the keyed toggle after its record loads and keep it mounted through same-record refreshes. The app supplies its permission checks, translated labels and API adapter. A pending save leaves the button enabled: another tap changes the desired value and the shared controller saves it next. A failed save restores the last confirmed value.

```tsx
import type { QueryKey } from '@molecule/app-query'
import { useQuery } from '@molecule/app-query-react'
import { useOptimisticValue } from '@molecule/app-react'
import { Button } from '@molecule/app-ui-react'

interface ToggleRecord {
  id: string
  enabled: boolean
  count: number
}
interface ToggleProps {
  record: ToggleRecord
  save: (id: string, desired: boolean) => Promise<ToggleRecord>
  labels: { active: string; inactive: string }
  onError: (error: unknown) => void
}

export function RecordToggle({ record, save, labels, onError }: ToggleProps) {
  const toggle = useOptimisticValue({
    value: { enabled: record.enabled, count: record.count },
    commit: async (desired) => {
      const saved = await save(record.id, desired.enabled)
      return { enabled: saved.enabled, count: saved.count }
    },
    onError: (error) => onError(error),
  })
  return (
    <Button
      type="button"
      aria-pressed={toggle.value.enabled}
      aria-busy={toggle.pending}
      onClick={(event) => {
        event.stopPropagation()
        toggle.update((current) => ({
          enabled: !current.enabled,
          count: Math.max(0, current.count + (current.enabled ? -1 : 1)),
        }))
      }}
    >
      {toggle.value.enabled ? labels.active : labels.inactive} <span>{toggle.value.count}</span>
    </Button>
  )
}

// Include record identity and viewer identity in queryKey. The API adapter belongs
// to this app; the query bond owns read ordering. Publishing the saved response
// supersedes a read already in flight, even if that older response arrives last.
export function CachedRecordToggle({
  queryKey,
  load,
  save,
  labels,
  onError,
}: Omit<ToggleProps, 'record'> & {
  queryKey: QueryKey
  load: (signal: AbortSignal) => Promise<ToggleRecord>
}) {
  const query = useQuery({ key: queryKey, fetch: load })
  if (!query.data) return null
  return (
    <RecordToggle
      key={query.data.id}
      record={query.data}
      labels={labels}
      onError={onError}
      save={async (id, desired) => {
        const saved = await save(id, desired)
        query.setData(saved)
        return saved
      }}
    />
  )
}
```

Do not copy server props into a second display state or remove prop dependencies to freeze a record. The hook protects pending intent, and the query cache orders older reads against saved responses. A later, genuinely changed server value still updates the control. Local menu state continues to use `useState`; it has no server commit.

```tsx
async function handleDelete(e: React.MouseEvent, id: string) {
  e.preventDefault()
  e.stopPropagation()
  if (!confirm('Delete this item?')) return
  await http.delete(`/api/items/${id}`)
  setItems((items) => items.filter((i) => i.id !== id))
}

;<button onClick={(e) => handleDelete(e, item.id)} aria-label="Delete" className="...">
  <span className="material-symbols-outlined">delete</span>
</button>
```

**Anti-patterns:**

- Don't leave a `<button><span>delete</span></button>` unwired — users will click and get nothing.
- Don't forget `e.stopPropagation()` when the card itself is a Link or has an onClick — otherwise click on delete ALSO navigates.
- Don't mutate the fetched array in place; use `setItems(xs => xs.filter(...))`.
