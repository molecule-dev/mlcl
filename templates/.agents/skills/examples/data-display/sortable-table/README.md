---
name: sortable-table
intent: |
  - "A table with sort and filter"
  - "Spreadsheet-like view of my data"
  - "Sortable list with multiple columns"
  - "Filter by status / date / etc"
  - "Admin grid with bulk actions"
keywords: [table, sortable, filter, sort, grid, columns, admin, spreadsheet]
---

# Sortable + filterable table

**When to copy this example:** the user wants column sorting and
filter chips on top of a paginated list. If they only need pagination,
use `data-display/paginated-user-list/` instead — this example
extends that one.

## What you'll install

```bash
cd /workspace
npm install @molecule/app-data-table-ui-react --workspace=app  # DataTableCard + TableToolbar + TableFooter
npm install @molecule/app-pagination-bar-react --workspace=app
```

## Files in this example

| Path                       | What it does                                                              |
| -------------------------- | ------------------------------------------------------------------------- |
| `api/handlers/orders.ts`   | `GET /orders` with `?sort=created_at&dir=desc&status=open` query support. |
| `app/pages/OrdersPage.tsx` | DataTable with sortable columns + status filter chip.                     |
| `app/locales/en/orders.ts` | Column header strings + filter labels.                                    |

## Anti-patterns

- Do not invent `@molecule/app-table`, `@molecule/app-spreadsheet`, or
  `@molecule/app-data-table-react` — those packages do not exist.
  Use `@molecule/app-data-table-ui-react` (exports `DataTableCard`,
  `TableToolbar`, `TableFooter`, `RowWithActions`, `TableEmpty`).
- Do not do client-side sorting on large datasets. Sort and filter
  on the server (pass via query params, return the filtered slice).
- Do not paginate AND sort separately on the client — the server has
  to do both together so page boundaries respect the sort.
- Do not roll your own column resize logic. Most teams don't need
  it — ship without first.
- `DataTableCard` does not have built-in sortable column headers —
  pass a `<SortableHeader>` button as the `header` ReactNode on
  each column and manage sort state yourself (see `OrdersPage.tsx`).

## Verify

Click a column header → API request includes `sort=col&dir=asc/desc`,
data updates. Apply filter → request adds the filter param,
pagination resets to page 1.
