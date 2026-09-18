---
id: filter-tabs
intent: list-fetch
title: Active-tab state filters the rendered list
hooks: [useState]
---

# Wire filter tabs / chips / segment controls to data

**When to use:** any list page with tabs like "All | Published | Draft | Archived" or chips like "Programming | Design | AI". The tabs' active state should drive a `.filter()` on the rendered array.

```tsx
const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')
const filtered = filter === 'all' ? items : items.filter((item) => item.status === filter)

// UI:
{
  ;(['all', 'published', 'draft'] as const).map((key) => (
    <button
      key={key}
      role="tab"
      aria-selected={filter === key}
      onClick={() => setFilter(key)}
      className={filter === key ? activeClass : inactiveClass}
    >
      {key}
    </button>
  ))
}
{
  filtered.map((item) => <ItemCard key={item.id} item={item} />)
}
```

**Anti-patterns:**

- Don't fire a new HTTP request on every tab click; filter the already-fetched array unless the dataset is huge.
- Don't forget to combine with search (filter first by tab, then by search, in that order) — both should be independent.
- If a tab has no matching items, render an empty-state hint ("No draft posts yet") — not a blank scrolled area.
