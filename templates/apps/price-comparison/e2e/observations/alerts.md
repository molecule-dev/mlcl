# Page observations: /alerts (Alerts)

> Filled by the dispatch-flagship agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                 | role      | expected behavior on interaction  | success signal          | failure signal |
| ------------------------------------------ | --------- | --------------------------------- | ----------------------- | -------------- |
| `[data-test=alerts-page]` shell            | container | page wrapper                      | rendered                | empty          |
| `[data-test=alerts-list]` items list       | list      | one row per /api/alerts           | ≥1 row after add        | empty          |
| `[data-test=alert-pause-<id>]` pause btn   | button    | PUT /api/alerts/:id status=paused | status badge → "Paused" | unchanged      |
| `[data-test=alert-resume-<id>]` resume btn | button    | PUT /api/alerts/:id status=active | status badge → "Active" | unchanged      |
| `[data-test=alert-remove-<id>]` remove btn | button    | DELETE /api/alerts/:id            | row disappears          | remains        |
| row click → /alerts/:id link               | link      | navigates to /alerts/:id          | URL changes             | dead link      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger      | method | path            | what request body or query is expected |
| ------------ | ------ | --------------- | -------------------------------------- |
| page load    | GET    | /api/alerts     | auth header only                       |
| pause/resume | PUT    | /api/alerts/:id | status                                 |
| remove       | DELETE | /api/alerts/:id | none                                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/alerts.spec.ts`
