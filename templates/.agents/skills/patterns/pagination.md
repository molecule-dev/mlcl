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

Compose the URL state with the list query, so a page change keeps the rows
already on screen until the next page answers instead of blanking the list:

```tsx
const { status, user } = useAuth<{ id: string }>()
const list = useListRoute({ pageSize: 20 })
// The viewer is in the key and is the principal (see list-fetch.md): the HTTP
// client sends the session, so the answer can depend on who is asking.
const viewer = user ? String(user.id) : 'anonymous'
const query = useQuery(
  status === 'loading' || !list.canLoad
    ? null
    : {
        key: [http.baseURL, 'invoices', viewer, list.filters, list.page],
        principal: viewer,
        keepPreviousData: true,
        fetch: async (signal: AbortSignal) =>
          unwrapList<Invoice>(
            await http.get('/api/invoices', {
              signal,
              params: { ...list.filters, limit: list.pageSize, offset: list.offset },
            }),
          ),
      },
)
// query.data stays on screen while the next page loads (query.isPreviousData);
// a completed empty page shows the empty state, and another viewer drops the rows.
```

For filters, add `filters: { status: { query: 'status' } }`, then call
`list.setFilters({ status: next })`: it updates the filter and resets page one
in one navigation. A path-owned filter uses `path: '/topics/:topic'` and
`filters: { topic: { param: 'topic' } }`; paging keeps that path without adding
a redundant query filter. Named path/query views use `selections`; read the
package's `useListRoute` example for protected views and `useQuery` composition.

Use server pagination for a server-paged list. For an already-loaded small list,
render `filtered.slice(list.offset, list.offset + list.pageSize)` instead.
Keep loading/error states and retry controls available when a page load fails,
and render them outside the item list — never as a placeholder item.

**Verify:** open page two directly, click another page, use Back/Forward, then
change a filter. The URL and rendered data must agree, the filter change
must return to page one while preserving unrelated query values and path params,
and the previous page's rows must stay visible until the new page's response
arrives.

## Keep the collection reachable from a selected view

Changing the selected filter must not replace the collection navigation.
`TabFilter.defaultTab` retains the default view even when `tabs` contains only
the selected filter. Its callback uses `useListRoute.select`, so changing views
returns to page one in the same navigation. Render this navigation outside the
query's loading, error and empty branches.

```tsx
import { TabFilter } from '@molecule/app-tab-filter-react'
import { useListRoute } from '@molecule/app-routing-react-router'

export function CollectionViews({
  path,
  labels,
}: {
  path: string
  labels: { all: string; filtered: string }
}) {
  const list = useListRoute({
    selections: {
      all: { path },
      filtered: { path, query: { view: 'filtered' } },
    },
    defaultSelection: 'all',
  })
  return (
    <TabFilter
      defaultTab={{ id: 'all', label: labels.all }}
      tabs={list.selection === 'filtered' ? [{ id: 'filtered', label: labels.filtered }] : []}
      activeId={list.selection ?? 'all'}
      onChange={(id) => {
        if (id === 'all' || id === 'filtered') list.select(id)
      }}
    />
  )
}
```

The path and query values are the application's route contract. For path-owned
views, declare both paths in `selections` instead. Verify a direct visit to a
filtered page two, return to the collection, and use Back: each view must retain
its navigation and show data for its current URL. Ordinary tab rows that have no
default view can omit `defaultTab`.
