# Page observations: /search (Results)

> Filled by AI agent via Playwright MCP. Validated by
> `e2e/search.spec.ts`. All elements observed in the live a11y tree.

## Procedure

1. `signup(page)` then `browser_navigate` → `/search`.
2. Snapshot result cards, hero heading, filter row.
3. Click `?origin=LHR&destination=DXB` and verify hero updates.
4. Toggle "Nonstop only" and verify card count is monotonic.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                      | role        | expected behavior on interaction       | success signal                | failure signal             |
| ----------------------------------------------- | ----------- | -------------------------------------- | ----------------------------- | -------------------------- |
| `getByRole(heading, level=1)`                   | heading     | shows current origin/destination       | text contains both IATA codes | mismatch with query params |
| `[href^="/flight/"]`                            | link (card) | routes to /flight/:id                  | URL matches `/flight/<id>`    | stays on /search           |
| `getByRole('button', { name: 'Nonstop only' })` | button      | filters cards in place                 | card count <= original        | introduces phantom rows    |
| query param sync                                | (system)    | `?origin=&destination=` re-runs search | hero updates to new pair      | hero stale                 |

## Hidden surfaces opened from this page

(none — filters are inline, no modal)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path                | what request body or query is expected |
| --------- | ------ | ------------------- | -------------------------------------- |
| page load | GET    | /api/flights/search | `?origin=&destination=&date=`          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/search.spec.ts`
