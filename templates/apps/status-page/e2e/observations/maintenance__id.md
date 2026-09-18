# Page observations: /maintenance/:id (Maintenance window detail)

> Filled from a live walk via Playwright MCP at /maintenance/:id. Re-walk
> if any visible element changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name              | role                           | expected behavior on interaction             | success signal           | failure signal                    |
| --------------------------------------- | ------------------------------ | -------------------------------------------- | ------------------------ | --------------------------------- |
| `getByRole('heading')` (window title)   | heading                        | render the window's title                    | title visible            | not rendered                      |
| Schedule window text                    | text                           | render `scheduled_for` and `scheduled_until` | timestamps visible       | not rendered                      |
| Affected components list                | list                           | display affected component ids/names         | items visible            | empty when components are present |
| `getByRole('link', { name: /maintenance | back/i })` (href=/maintenance) | link                                         | navigate to /maintenance | URL becomes /maintenance          | nav fails |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path                 | what request body or query is expected |
| --------- | ------ | -------------------- | -------------------------------------- |
| Page load | GET    | /api/maintenance/:id | returns single maintenance object      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/22-maintenance__id.spec.ts`
