---
id: search-filter
intent: list-fetch
title: Search input filters the rendered list
hooks: [useState]
---

# Wire the search input to the rendered list

**When to use:** any list page with a search input that so far only controls a `useState` variable. Typing should actually narrow the visible items.

```tsx
const [search, setSearch] = useState('')
const filtered = search
  ? items.filter(item =>
      [item.title, item.excerpt, item.description]
        .filter(Boolean)
        .some(s => String(s).toLowerCase().includes(search.toLowerCase())))
  : items

// ...later in the render:
<input value={search} onChange={e => setSearch(e.target.value)} />
// ...and the list maps `filtered`, not `items`:
{filtered.map(item => <ItemCard key={item.id} item={item} />)}
{filtered.length === 0 && <p>No results for &quot;{search}&quot;.</p>}
```

**Anti-patterns:**

- Don't `.map(items)` when a search exists — always `.map(filtered)` so the user sees the effect.
- Don't do server-side search unless a search endpoint exists; client-side `.filter` is the default.
- Don't forget to re-show a no-results message when `filtered.length === 0`.
