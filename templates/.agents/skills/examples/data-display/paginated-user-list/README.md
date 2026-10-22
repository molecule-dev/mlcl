---
name: paginated-user-list
intent: |
  - "List of users with pagination"
  - "Show all my customers in a table with page navigation"
  - "Long list, slow page — make it not load all at once"
  - "Admin panel listing every user"
  - "Member directory"
keywords: [list, pagination, table, paginated, page navigation, browse]
---

# Paginated list (any resource)

**When to copy this example:** the user wants a list of records with
page navigation. The handler pattern is the same for any resource —
swap `'users'` for the table name. The frontend pattern works for any
list page.

## What you'll install

```bash
cd /workspace
npm install @molecule/app-pagination-bar-react @molecule/app-routing-react-router --workspace=app
# Plus a data table package if you want sortable columns:
npm install @molecule/app-data-table-ui-react --workspace=app
# API side: validateQuery() + paginationSchema for the paginated handler
npm install @molecule/api-middleware-validation --workspace=api
```

If the resource is users, also install `@molecule/api-resource-user`
on the API side — it gives you the User type + handler scaffolding.

## Files in this example

| Path                      | What it does                                                                                                                                                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/handlers/users.ts`   | Express handler — `GET /users?page=1&limit=20` returns `{ data, total, page, limit }`. Uses the abstract `findMany` / `count` from `@molecule/api-database` (NOT raw SQL — the database bond resolves to whichever provider is wired). |
| `app/pages/UsersPage.tsx` | React page — fetches + renders + paginates using `useHttpClient()` and `<PaginationBar>`. Uses `getClassMap()` for layout.                                                                                                             |
| `app/locales/en/users.ts` | English copy.                                                                                                                                                                                                                          |

## How to adapt

1. Copy the three files. Rename `users` → your resource (e.g. `orders`,
   `tickets`).
2. In `api/src/App/router.ts`, register the handler: `router.use('/users', usersHandler)`.
3. Drop `<UsersPage />` into your React Router routing. `useListRoute` reads
   the current `?page=` directly; it works under `BrowserRouter` without a
   data router or an additional provider.
4. Use `getClassMap()` for any custom styling — never inline Tailwind.

## Anti-patterns (do NOT do these)

- Do not write raw SQL — the `findMany` / `count` functions handle
  the SELECT/COUNT/OFFSET/LIMIT correctly across every database
  provider.
- Do not load all rows then paginate client-side. Always pass
  `limit` + `offset` to the database call.
- Do not invent `@molecule/app-pagination-react` — the real package
  is `@molecule/app-pagination-bar-react`.
- Do not mirror page/filter state in `useState` or rebuild page links from API
  filters. `useListRoute` preserves the current path and unrelated query values.
  For filtered views, declare its `filters` and `selections`, then pass
  `list.setPage` to `PaginationBar` and use `list.href` for ordinary links.

## Verify it works

```
GET /users?page=1&limit=20  →  200 { data: [...], total: 1234, page: 1, limit: 20 }
GET /users?page=2&limit=20  →  200 next page
```

In the UI: clicking the page-2 button updates the URL query and refetches.
