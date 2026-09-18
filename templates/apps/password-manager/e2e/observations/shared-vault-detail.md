# Page observations: /shared/:id (SharedVaultDetail)

> Filled from a live walk via Playwright MCP at /shared/:id. Re-walk if any
> visible element changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                    | role          | expected behavior on interaction                                 | success signal                                                             | failure signal                             |
| --------------------------------------------- | ------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------ |
| `getByText(<vaultName>)` OR `getByText(/error | not found/i)` | text                                                             | render vault name + members for valid id, or an error state for a bogus id | either vault name OR error message visible | page hangs blank |
| `getByRole('link', { name: /back/i })`        | link          | navigate to /shared (works from both valid and not-found states) | URL becomes /shared                                                        | nav fails                                  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger    | method | path            | what request body or query is expected    |
| ---------- | ------ | --------------- | ----------------------------------------- |
| page mount | GET    | /api/vaults/:id | returns single vault record + member list |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec
