# Page observations: /vault (Vault)

> Filled from a live walk via Playwright MCP at /vault. Re-walk if any
> visible element changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                         | role           | expected behavior on interaction                       | success signal                            | failure signal         |
| -------------------------------------------------- | -------------- | ------------------------------------------------------ | ----------------------------------------- | ---------------------- |
| `getByTestId('vault-empty')` or rendered item rows | region         | render empty state when no items, otherwise list items | empty marker visible OR item rows visible | page blank             |
| `getByRole('link', { name: /add                    | new item/i })` | link                                                   | navigate to /vault/new                    | URL becomes /vault/new | nav fails |
| `getByRole('link')` (item row)                     | link           | navigate to /vault/:id                                 | URL becomes /vault/<id>                   | click no-ops           |
| `getByPlaceholder(/search/i)`                      | searchbox      | filter visible items by query                          | rows filter live                          | no change              |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger    | method | path       | what request body or query is expected           |
| ---------- | ------ | ---------- | ------------------------------------------------ |
| page mount | GET    | /api/items | returns array of items belonging to current user |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec
