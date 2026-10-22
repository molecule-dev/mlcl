---
id: pagination
intent: list-fetch
title: URL-backed pagination that preserves filters and history
hooks: [useListRoute]
---

# Paginate from the current URL

**When to use:** a React Router list with Next/Previous buttons or numbered pages.
`useListRoute` from `@molecule/app-routing-react-router` owns page/filter/view state;
`PaginationBar` renders the controls. It works inside ordinary `BrowserRouter`.

```tsx
import { Link } from 'react-router'
import { PaginationBar } from '@molecule/app-pagination-bar-react'
import { useListRoute } from '@molecule/app-routing-react-router'

const list = useListRoute({ pageSize: 20 })
// API request: { limit: list.pageSize, offset: list.offset }.
// Include list.page and every effective filter in the data-query key.
const totalPages = Math.max(1, Math.ceil(total / list.pageSize))

<PaginationBar
  page={list.page}
  pageSize={list.pageSize}
  total={total}
  totalPages={totalPages}
  onPageChange={list.setPage}
/>
// Custom navigation uses real links, keeping the current path and query:
<Link to={list.href({ page: 2 })}>{t('list.pageTwo', undefined, { defaultValue: 'Page 2' })}</Link>
```

For filters, add `filters: { status: { query: 'status' } }`, then call
`list.setFilters({ status: next })`: it updates the filter and resets page one
in one navigation. A path-owned filter uses `path: '/topics/:topic'` and
`filters: { topic: { param: 'topic' } }`; paging keeps that path without adding
a redundant query filter. Named path/query views use `selections`; read the
package's `useListRoute` example for protected views and `useQuery` composition.

Use server pagination for a server-paged list. For an already-loaded small list,
render `filtered.slice(list.offset, list.offset + list.pageSize)` instead.
Keep loading/error states and retry controls available when a page load fails.

**Verify:** open page two directly, click another page, use Back/Forward, then
change a filter. The URL and rendered data must agree, and the filter change
must return to page one while preserving unrelated query values and path params.
