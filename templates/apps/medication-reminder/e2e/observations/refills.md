# Page observations: /refills (Refills)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                | role     | expected behavior on interaction                                                        | success signal                                                                        | failure signal                  |
| ----------------------------------------- | -------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------- |
| Refills heading                           | heading  | renders "Refills" heading                                                               | visible                                                                               | absent                          |
| Urgent / Due-soon / Healthy summary tiles | group    | counts derived from `GET /api/refills/alerts`                                           | numeric tiles match alerts data                                                       | tiles always 0                  |
| Alert card per medication                 | listitem | rendered from /refills/alerts response                                                  | seeded medication appears as a row                                                    | row missing                     |
| Request refill button (per card)          | button   | POSTs /api/refills/:medication_id/request, optimistic UI, list shows status="requested" | next render shows requested status; persisted refill_request row visible via /refills | status stays urgent after click |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger       | method | path                     | what request body or query is expected |
| ------------- | ------ | ------------------------ | -------------------------------------- |
| Page mount    | GET    | /api/refills/alerts      | (none)                                 |
| Request click | POST   | /api/refills/:id/request | (none)                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/refills.spec.ts`
