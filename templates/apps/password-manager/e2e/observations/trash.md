# Page observations: /trash (Trash)

> Filled from a live walk via Playwright MCP at /trash. Re-walk if any
> visible element changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                  | role                             | expected behavior on interaction                      | success signal                                           | failure signal                       |
| ------------------------------------------- | -------------------------------- | ----------------------------------------------------- | -------------------------------------------------------- | ------------------------------------ |
| `getByText(/empty                           | nothing/i)` or trashed item rows | text                                                  | render empty state when no trashed items, otherwise list | empty marker OR trashed rows visible | page blank    |
| `getByRole('button', { name: /restore/i })` | button                           | POST /api/items/:id/restore; row re-appears in /vault | item back in active list                                 | still in trash                       |
| `getByRole('button', { name: /purge         | delete forever/i })`             | button                                                | DELETE /api/items/:id; row vanishes for good             | item not in /trash or /vault         | item persists |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger    | method | path                      | what request body or query is expected |
| ---------- | ------ | ------------------------- | -------------------------------------- |
| page mount | GET    | /api/items?status=trashed | returns trashed items for user         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec
