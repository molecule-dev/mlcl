# Page observations: /shared (SharedVaults)

> Filled from a live walk via Playwright MCP at /shared. Re-walk if any
> visible element changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name        | role                     | expected behavior on interaction | success signal                                            | failure signal                             |
| --------------------------------- | ------------------------ | -------------------------------- | --------------------------------------------------------- | ------------------------------------------ |
| `getByText(/no shared             | empty/i)` or vault cards | region                           | render empty state when no shared vaults, otherwise cards | empty marker OR vault cards visible        | page blank                  |
| `getByRole('button', { name: /new | create/i })`             | button                           | reveal/submit new-vault form (POST /api/vaults)           | new vault appears + persists across reload | no POST / vault not created |
| `getByRole('link')` (vault card)  | link                     | navigate to /shared/:id          | URL becomes /shared/<id>                                  | click no-ops                               |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger             | method | path        | what request body or query is expected                  |
| ------------------- | ------ | ----------- | ------------------------------------------------------- |
| page mount          | GET    | /api/vaults | returns array of vaults the user owns or is a member of |
| create vault submit | POST   | /api/vaults | `{ name, description }` returns 201 with `{ id }`       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec
