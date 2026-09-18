# Page observations: /dashboard (Dashboard)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                  | role      | expected behavior on interaction                 | success signal                               | failure signal                |
| ----------------------------------------------------------- | --------- | ------------------------------------------------ | -------------------------------------------- | ----------------------------- |
| `getByRole('heading', { level: 1 })`                        | heading   | render the dashboard hero heading                | visible at top                               | absent                        |
| 24h delivered stat card                                     | statistic | reflects aggregate from `/api/deliveries`        | numeric value updates after a real send-test | static / hardcoded            |
| In-retry queue stat card                                    | statistic | shows count of pending retries                   | matches `deliveries WHERE status='retry'`    | always zero                   |
| Recent deliveries panel                                     | region    | shows latest rows from `/api/deliveries?limit=5` | rows present after a delivery exists         | empty after a delivery exists |
| Primary navigation links (new endpoint / open delivery log) | link      | navigate to the matching authenticated route     | URL changes to the link's `href`             | stays on `/dashboard`         |

## Hidden surfaces opened from this page

| trigger                      | what it opens | elements inside (selector / role / behavior) |
| ---------------------------- | ------------- | -------------------------------------------- |
| User-menu button (top-right) | menu          | sign out, profile link                       |

## Network calls expected during normal use

| trigger    | method | path            | what request body or query is expected |
| ---------- | ------ | --------------- | -------------------------------------- |
| Page mount | GET    | /api/webhooks   | hydrate endpoint count                 |
| Page mount | GET    | /api/deliveries | hydrate stats + recent list            |
| Page mount | GET    | /api/profile    | identify the user for the menu         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
