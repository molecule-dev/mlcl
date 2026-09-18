# Page observations: /flight/:id (FlightDetail)

> Filled by AI agent via Playwright MCP. Validated by
> `e2e/flight__id.spec.ts`.

## Procedure

1. `signup(page)`, fetch a real flight via `getSampleFlight(page)`.
2. Navigate `/flight/<id>` and snapshot.
3. Verify GET /api/flights/:id returned 2xx.
4. Probe the two outbound links.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name | role   | expected behavior on interaction   | success signal                       | failure signal       |
| -------------------------- | ------ | ---------------------------------- | ------------------------------------ | -------------------- |
| flight detail card         | region | renders flight + price after fetch | card visible with origin/destination | spinner sticks       |
| `link "Back to results"`   | link   | routes to /search                  | URL ends /search                     | stays on /flight/:id |
| `a[href="/book/<id>"]`     | link   | routes to /book/:id with same id   | URL ends /book/<id>                  | navigates elsewhere  |

## Hidden surfaces opened from this page

(none — single detail card)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger   | method | path             | what request body or query is expected |
| --------- | ------ | ---------------- | -------------------------------------- |
| page load | GET    | /api/flights/:id | id from URL                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/flight__id.spec.ts`
