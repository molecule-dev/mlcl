# Page observations: /sellers/:handle (SellerProfile)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated — /sellers/:handle is mounted under <AuthGuard>
- [x] Visited via the auction detail page seller link or directly with a handle/id

## Elements

| selector / accessible name                    | role    | expected behavior on interaction | success signal          | failure signal |
| --------------------------------------------- | ------- | -------------------------------- | ----------------------- | -------------- |
| `getByRole("heading", { level: 1 })`          | heading | render seller name (or fallback) | visible                 | absent         |
| `getByText(/We could not find that seller/i)` | text    | shown when API returns 404       | visible on bogus handle | absent         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path                 | what request body or query is expected |
| --------- | ------ | -------------------- | -------------------------------------- |
| page load | GET    | /api/sellers/:handle | (none)                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/sellers__handle.spec.ts`
