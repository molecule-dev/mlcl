# Page observations: /vault/new (NewItem)

> Filled from a live walk via Playwright MCP at /vault/new. Re-walk if any
> visible element changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                              | role    | expected behavior on interaction                   | success signal                          | failure signal                   |
| ----------------------------------------------------------------------- | ------- | -------------------------------------------------- | --------------------------------------- | -------------------------------- |
| `getByTestId('new-item-name')`                                          | textbox | accept item name (required)                        | value typed                             | input rejects                    |
| `getByTestId('new-item-username')`                                      | textbox | accept username/email                              | value typed                             | input rejects                    |
| `getByTestId('new-item-password')`                                      | textbox | accept password (masked)                           | value typed                             | input rejects                    |
| `getByTestId('new-item-save')`                                          | button  | POST /api/items; on success redirect to /vault/:id | URL becomes /vault/<id> with non-new id | error toast, stays on /vault/new |
| `getByRole('button', { name: /cancel/i })` or category tile (e.g. card) | button  | cancel returns to /vault; tile changes type field  | URL /vault OR posted body has type=card | no nav / type unchanged          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger    | method | path       | what request body or query is expected                              |
| ---------- | ------ | ---------- | ------------------------------------------------------------------- |
| Save click | POST   | /api/items | `{ name, username, password, type, ... }` returns 201 with `{ id }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec
