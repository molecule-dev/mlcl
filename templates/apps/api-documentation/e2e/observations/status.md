# Page observations: /status (Status)

Source: live walk via Playwright + e2e/status.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                      | role        | expected behavior on interaction             | success signal                   | failure signal                                                          |
| ----------------------------------------------- | ----------- | -------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------- |
| `getByRole("heading", { name: /API status/i })` | heading     | page renders + GET /api/reports/status fires | heading visible + GET in network | heading missing or GET fails                                            |
| `getByText(/All services nominal                | Operational | Degraded/i)`                                 | text                             | either the empty-services state OR live services list shows status text | visible | spinner persists |
| `getByText(/Real-time status/i)`                | text        | subtitle visible                             | visible                          | missing                                                                 |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path                | what request body or query is expected        |
| ------------ | ------ | ------------------- | --------------------------------------------- |
| initial load | GET    | /api/reports/status | 200 with {services} (empty array on fresh DB) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/status.spec.ts`
