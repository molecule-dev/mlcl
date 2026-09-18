# Page observations: /alerts/:id (AlertDetail)

> Filled by the dispatch-flagship agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                     | role      | expected behavior on interaction  | success signal       | failure signal |
| ---------------------------------------------- | --------- | --------------------------------- | -------------------- | -------------- |
| `[data-test=alert-detail-page]` shell          | container | renders alert + product context   | visible after load   | empty          |
| `[data-test=alert-detail-target]` target price | text      | reflects alert.target_price       | dollars rendered     | mismatch       |
| `[data-test=alert-detail-status]` status badge | label     | reflects alert.status             | "Active" / "Paused"  | wrong text     |
| `[data-test=alert-detail-pause]` pause btn     | button    | PUT /api/alerts/:id status=paused | badge → "Paused"     | unchanged      |
| `[data-test=alert-detail-delete]` delete btn   | button    | DELETE /api/alerts/:id → /alerts  | redirects to /alerts | stays          |
| "Back to alerts" link                          | link      | navigates to /alerts              | URL becomes /alerts  | dead link      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path                           | what request body or query is expected |
| --------- | ------ | ------------------------------ | -------------------------------------- |
| page load | GET    | /api/alerts/:id                | none                                   |
| page load | GET    | /api/prices/history/:productId | none                                   |
| pause     | PUT    | /api/alerts/:id                | status                                 |
| delete    | DELETE | /api/alerts/:id                | none                                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/alerts__id.spec.ts`
