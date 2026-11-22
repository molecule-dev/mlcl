---
name: app-patterns
description: Frontend architecture patterns. Creating pages, components, React hooks, state management, routing, and branding.
---

# App Patterns

## Project Layout

```
app/src/
├── App.tsx              # Root component — add routes here
├── bonds/               # Provider wiring (see bond-system skill)
│   └── index.ts         # Imports all bond setup functions
├── branding.ts          # App name, logo, colors
├── pages/               # One file per page/view
│   └── TodoList.tsx
└── components/          # Shared UI components
    └── TodoItem.tsx
```

## Creating a New Page

1. Create `app/src/pages/MyPage.tsx`
2. Add a `<Route>` in `app/src/App.tsx`
3. For a TOP-LEVEL page, add a nav link so users can actually reach it (see
   "Making it reachable" below) — a routed page with no link is only reachable
   by typing its URL.

### Page Template

Under the router; bond a query provider (`@molecule/app-query-memory`) once. Endpoint: search/limit/offset.

```tsx
import type { JSX } from 'react'
import { Link } from 'react-router'
import type { UserProfile } from '@molecule/app-auth'
import { unwrapList } from '@molecule/app-http'
import { useQuery } from '@molecule/app-query-react'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { useListRoute } from '@molecule/app-routing-react-router'
import { getClassMap } from '@molecule/app-ui'

interface Todo {
  id: string
  title: string
}

export function TodoList(): JSX.Element {
  const cm = getClassMap()
  const http = useHttpClient()
  const { t } = useTranslation()
  const { status, user } = useAuth<UserProfile>()
  const label = (key: string, fallback: string) => t(key, undefined, { defaultValue: fallback })
  const list = useListRoute({ pageSize: 20, filters: { search: { defaultValue: '' } } })
  // The key names what the answer depends on, the viewer included (the HTTP client
  // sends the session). Wait while it restores; the client holds requests until then.
  const viewer = user ? String(user.id) : 'anonymous'
  const items = useQuery(
    status === 'loading'
      ? null
      : {
          key: [http.baseURL, 'todos', viewer, list.filters, list.page],
          principal: viewer,
          keepPreviousData: true,
          fetch: (signal: AbortSignal) =>
            http
              .get('/api/todos', {
                signal,
                params: { ...list.filters, limit: list.pageSize, offset: list.offset },
              })
              .then(unwrapList<Todo>),
        },
  )

  return (
    <section className={cm.sp('p', 4)}>
      <h1>{label('todos.title', 'My Todos')}</h1>
      <label>
        {label('todos.search', 'Search todos')}
        <input
          value={list.filters.search}
          onChange={(event) => list.setFilters({ search: event.target.value })}
        />
      </label>
      {/* Status is not an item: it stays outside the list. */}
      {status === 'loading' || items.isFetching ? (
        <p role="status">{label('common.loading', 'Loading...')}</p>
      ) : null}
      {items.status === 'error' ? (
        <p role="alert">{label('todos.loadFailed', 'Could not load todos.')}</p>
      ) : null}
      <ul>
        {items.data?.map((item) => (
          <li key={item.id}>{item.title}</li>
        ))}
      </ul>
      {!items.isPreviousData && items.data?.length === 0 ? (
        <p>{label('todos.empty', 'No todos yet.')}</p>
      ) : null}
      {list.page > 1 ? (
        <Link to={list.href({ page: list.page - 1 })}>
          {label('common.previous', 'Previous page')}
        </Link>
      ) : null}
      <Link to={list.href({ page: list.page + 1 })}>{label('common.next', 'Next page')}</Link>
    </section>
  )
}
```

### Adding to App.tsx

```tsx
// app/src/App.tsx — add import
import { TodoList } from './pages/TodoList.js'

// Inside <Routes>:
;<Route path="/todos" element={<TodoList />} />
```

### Making it reachable (nav link)

A `<Route>` makes the URL work, but users still can't get there without a link. For
a TOP-LEVEL page (a new section — NOT a detail/sub-page opened from a list row or
button), also add a nav entry. Find the component that renders the app's existing page
links — usually a `SideNavBar` / `Sidebar` / `Header` / nav under
`app/src/components/` (open it; it already lists the current links) — and add one for
your new route in the SAME shape it uses (many apps map an array of
`{ to, icon, label }`; use `t()` for the label like the siblings). A feature the user
can't navigate to isn't done.

## React Hooks from @molecule/app-react

| Hook                      | Purpose      | Usage                                                         |
| ------------------------- | ------------ | ------------------------------------------------------------- |
| `useHttpClient()`         | API calls    | `const http = useHttpClient()`                                |
| `useTranslation()`        | i18n         | `const { t } = useTranslation()`                              |
| `useAuth()`               | Auth state   | `const { user, isAuthenticated, logout } = useAuth()`         |
| `useProfileForm(options)` | Profile form | See `patterns/settings-update.md` below                       |
| `useStore(store)`         | Shared state | `const count = useStore(myStore, { selector: s => s.count })` |

### Editable account forms

`useProfileForm` uses the auth client's method/endpoint/adapters. `.agents/skills/patterns/settings-update.md` covers async hydration, dirty partial saves, nullable fields, optional password, auth/cache updates and native controls.

### URL-backed lists, feeds and view tabs

`useListRoute` under `BrowserRouter` retains path/query/hash on page changes; filters/views reset page one atomically. `selections` owns browser variants, `filters` path values, independently of API parameters. `setPage` fits `PaginationBar`. Compose it with `useQuery` as in the Page Template: the key names everything the answer depends on, the viewer too (the HTTP client sends the session); only an endpoint that answers every viewer the same takes a viewer-free key. `principal` (that viewer) + `keepPreviousData` keep the rows on screen while the next page loads and drop them when the viewer changes; pass `null` while auth `status` is `'loading'`. Protected views: auth `status`/app `redirectTo`, `requiresAuth: true`, `null` query when `!list.canLoad`. Public URLs stay public after login. Loading/empty/error status renders outside the item list, never as a placeholder item. Controls: routing README, `patterns/pagination.md`, `filter-tabs.md`.

### HTTP Client

API paths start with `/api`. Pass whole responses to `unwrapList` / `unwrapSingle` from `@molecule/app-http`:

```tsx
import { unwrapList, unwrapSingle } from '@molecule/app-http'

const http = useHttpClient()

// unwrapList: array, { data: [...] }, or resource { data, total, limit, offset } envelope.
const todos = unwrapList<Todo>(await http.get('/api/todos'))

// GET one: Todo | null
const todo = unwrapSingle<Todo>(await http.get(`/api/todos/\${id}`))

// POST
await http.post('/api/todos', { title: 'Buy milk' })

// PUT / PATCH
await http.put(`/api/todos/\${id}`, { completed: true })
await http.patch(`/api/todos/\${id}`, { title: 'Updated' })

// DELETE
await http.delete(`/api/todos/\${id}`)
```

## State Management (Zustand)

For state shared across components, use Zustand stores:

```typescript
// app/src/stores/todoStore.ts
import { create } from 'zustand'

interface TodoState {
  items: any[]
  setItems: (items: any[]) => void
  addItem: (item: any) => void
}

export const useTodoStore = create<TodoState>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
}))
```

```tsx
// In a component:
import { useTodoStore } from '../stores/todoStore.js'

function TodoList(): JSX.Element {
  const items = useTodoStore((s) => s.items)
  const setItems = useTodoStore((s) => s.setItems)
  // ...
}
```

## Branding

Customize `app/src/branding.ts`:

```typescript
export const APP_NAME = 'My App'
export const APP_LOGO = '/logo.svg'
export const THEME = {
  primaryColor: '#3b82f6',
  // ...
}
```

## Component Patterns

### Shared Component

```tsx
// app/src/components/Button.tsx
import type { JSX } from 'react'
import { getClassMap } from '@molecule/app-ui'

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary'
  disabled?: boolean
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
}: ButtonProps): JSX.Element {
  const cm = getClassMap()
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cm.cn(
        cm.button({ variant: variant === 'primary' ? 'solid' : 'outline' }),
        cm.sp('px', 4),
        cm.sp('py', 2),
        'rounded-md',
      )}
    >
      {children}
    </button>
  )
}
```

### Reusing an existing component — read its props first

Before you render a component you did NOT just write — especially one the
template already ships (a Tile/Card/Row/Panel/Page, e.g. `<CourseTile>`,
`<PlanUpdatedPage>`) — **open its source file and read its props interface**,
then pass its EXACT prop names. Do NOT guess prop names or shapes from the
component's name. A wrong or missing prop is a build error you'll have to fix
anyway (`TS2322` "Property 'x' does not exist on type ...Props", or `TS2339`).
Reading `app/src/components/<Name>.tsx` once is far cheaper than a
verify→fix round spent guessing — e.g. don't assume `<CourseTile course={c} />`
when the prop is actually `data`/`item`, or pass `messageDefault` to a
component that has no such prop.

### Form Component

```tsx
import type { JSX } from 'react'
import { useState } from 'react'
import { getClassMap } from '@molecule/app-ui'
import { useHttpClient, useTranslation } from '@molecule/app-react'

export function AddTodoForm({ onAdd }: { onAdd: () => void }): JSX.Element {
  const cm = getClassMap()
  const http = useHttpClient()
  const { t } = useTranslation()
  const [title, setTitle] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    await http.post('/api/todos', { title })
    setTitle('')
    onAdd()
  }

  return (
    <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'row', gap: 'sm' }))}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('todos.placeholder', undefined, { defaultValue: 'What needs to be done?' })}
        className={cm.cn(cm.input(), cm.sp('px', 3), cm.sp('py', 2))}
      />
      <button
        type="submit"
        className={cm.cn(cm.button({ variant: 'solid' }), cm.sp('px', 4), cm.sp('py', 2))}
      >
        {t('todos.add', undefined, { defaultValue: 'Add' })}
      </button>
    </form>
  )
}
```

## ESM Import Rule

Always use `.js` extensions in TypeScript imports:

```tsx
import { TodoList } from './pages/TodoList.js' // ✓ correct
import { TodoList } from './pages/TodoList' // ✗ wrong
```
