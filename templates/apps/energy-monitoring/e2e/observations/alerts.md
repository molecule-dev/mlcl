# Page observations: /alerts (Alerts)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                             | role                  | expected behavior on interaction                                                       | success signal                                         | failure signal                |
| -------------------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------- |
| `page.locator('[data-mol-id="alerts-rules"] [data-mol-id^="alerts-rule-"]')`           | region                | lists seeded alert rules (high-draw + solar-underperformance); at least one is enabled | count >= 2; enabled toggle reflects DB state           | empty or missing rule list    |
| `page.locator('[data-mol-id="alerts-run-check"]')`                                     | button                | POST /api/alerts/check creates alerts on seeded readings                               | subsequent /api/alerts list grows; alert cards render  | no alerts created             |
| `page.locator('[data-mol-id^="alert-card-"] [data-mol-id^="alert-ack-"]').first()`     | button                | acknowledge button — POST /api/alerts/:id/acknowledge                                  | alert status flips to "acknowledged" via /api/alerts   | status unchanged              |
| `page.locator('[data-mol-id^="alert-card-"] [data-mol-id^="alert-dismiss-"]').first()` | button                | dismiss button — DELETE /api/alerts/:id                                                | alert removed from list                                | still present                 |
| `getByRole('link', { name: /new rule                                                   | \+ rule/i }).first()` | link                                                                                   | navigates to /alerts/rules/new                         | URL becomes /alerts/rules/new | URL unchanged |
| `page.locator('[data-mol-id^="alerts-rule-"] button')`                                 | button                | rule row toggle / delete buttons                                                       | enabled flips OR row removed in /api/alerts/rules/list | no DB change                  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (n/a)         | (n/a)                                        |

## Network calls expected during normal use

| trigger      | method | path                        | what request body or query is expected |
| ------------ | ------ | --------------------------- | -------------------------------------- |
| initial load | GET    | /api/alerts                 | 200 → open alerts                      |
| initial load | GET    | /api/alerts/rules/list      | 200 → seeded alert rules               |
| Run check    | POST   | /api/alerts/check           | no body → `{ alerts_created, alerts }` |
| acknowledge  | POST   | /api/alerts/:id/acknowledge | 200 → updated alert                    |
| dismiss      | DELETE | /api/alerts/:id             | 204                                    |
| rule toggle  | PATCH  | /api/alerts/rules/:id       | `{ enabled }` → 200                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/alerts.spec.ts`
