---
id: filter-tabs
intent: list-fetch
title: URL-backed filter and selection links
hooks: [useListRoute]
---

# Make list filters and selected views share the URL

**When to use:** a React Router page with filter tabs/chips or path-selected
views. Use `useListRoute` from `@molecule/app-routing-react-router`; its URL
state stays correct on direct visits, reloads, links and Back/Forward.

```tsx
import { Link } from 'react-router'
import { useListRoute } from '@molecule/app-routing-react-router'

const list = useListRoute({
  filters: { status: { query: 'status', defaultValue: 'all' } },
})

{
  ;(['all', 'published', 'draft'] as const).map((status) => (
    <Link
      key={status}
      to={list.href({ filters: { status } })}
      aria-current={list.filters.status === status ? 'page' : undefined}
    >
      {t(`list.status.${status}`, undefined, { defaultValue: status })}
    </Link>
  ))
}
// Request with list.filters.status, list.pageSize and list.offset.
// For a complete local dataset, filter the loaded array by list.filters.status.
```

When a view has its own route, declare the app's paths explicitly:

```tsx
const list = useListRoute({
  selections: {
    authored: { path: '/members/:member' },
    saved: { path: '/members/:member/saved' },
  },
})
// list.href({ selection: 'saved' }) keeps the current :member and resets page.
// list.href({ page: 2 }) stays on that saved view.
// Derive API filters from list.selection and list.params.member separately.
```

Query-selected views use `query` constraints on each selection. A protected view
sets `requiresAuth: true` and the hook receives
`auth: { status, redirectTo: '/sign-in' }`. It waits through session restoration;
a confirmed signed-out visit redirects. Pass `null` to `useQuery` while
`list.canLoad` is false. Include the signed-in principal in the query key.
Always render a reachable link to the public view in protected empty states.

Do not mirror selected view in `useState` or auto-select a private view when
auth changes: an explicit public URL stays public. Filter/selection links reset
page one atomically. Browser paths and API filters are separate contracts; an
API's filter name does not determine a path-selected view's browser URL.
