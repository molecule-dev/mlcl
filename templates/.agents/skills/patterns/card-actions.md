---
id: card-actions
intent: list-fetch
title: Wire Edit / Delete / Favorite / More buttons on cards
hooks: [Link, useHttpClient, useState]
---

# In-card action buttons

**When to use:** list items with inline actions (Edit, Delete, Favorite, More menu). These are NOT the main card click — they're nested inside it.

**Rules:**

- **Edit** → `<Link to={`/posts/${item.id}/edit`}>` with `onClick={e => e.stopPropagation()}` so the outer card navigation doesn't fire.
- **Delete** → onClick calls `http.delete(`/api/items/${item.id}`)`, removes the item from local state, shows confirm prompt first.
- **Favorite / Star / Bookmark** → onClick toggles a local state boolean + optionally calls `http.post('/api/items/:id/favorite')`.
- **More / ... menu** → toggles a local open state that renders a dropdown; clicking outside closes it.

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
