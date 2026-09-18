# Page observations: /trips (My Trips)

> Filled by AI agent via Playwright MCP. Validated by
> `e2e/trips.spec.ts`.

## Procedure

1. `signup(page)` → /trips empty state.
2. Book a flight via `bookFlight()` helper, refresh /trips, observe row.
3. Click empty-state CTA → /search.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name      | role   | expected behavior on interaction             | success signal       | failure signal     |
| ------------------------------- | ------ | -------------------------------------------- | -------------------- | ------------------ |
| empty-state region              | region | shows "No trips yet" copy when list is empty | text + CTA visible   | trip list rendered |
| `a[href="/trips/<id>"]`         | link   | routes to TripDetail                         | URL ends /trips/<id> | stays on /trips    |
| `a[href="/search"]` (empty CTA) | link   | routes to /search                            | URL ends /search     | no nav             |

## Hidden surfaces opened from this page

(none — list view, no expansion)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path       | what request body or query is expected |
| --------- | ------ | ---------- | -------------------------------------- |
| page load | GET    | /api/trips | (no body)                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/trips.spec.ts`
