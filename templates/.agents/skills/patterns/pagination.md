---
id: pagination
intent: list-fetch
title: Paginate the rendered list with current-page state
hooks: [useState]
---

# Wire pagination controls to slice the list

**When to use:** any list page with Next/Previous buttons or numbered pages. The buttons must actually change what the user sees.

```tsx
const PAGE_SIZE = 10
const [page, setPage] = useState(1)
const total = filtered.length
const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

// UI:
{
  paged.map((item) => <ItemCard key={item.id} item={item} />)
}

;<nav aria-label="Pagination">
  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
    Previous
  </button>
  <span>
    Page {page} of {pageCount}
  </span>
  <button onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page >= pageCount}>
    Next
  </button>
</nav>
```

**Anti-patterns:**

- Don't hardcode page indicator text; compute from state.
- Reset to page 1 when the filter or search changes (otherwise user sees "page 3 of 2").
- Don't forget `disabled` on the edge buttons — a disabled Previous on page 1 is the standard affordance.
