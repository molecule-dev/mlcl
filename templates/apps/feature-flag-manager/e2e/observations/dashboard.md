# Page observations: /dashboard (Dashboard)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`); seed runs on first load

## Elements

| selector / accessible name                                     | role    | expected behavior on interaction                   | success signal          | failure signal |
| -------------------------------------------------------------- | ------- | -------------------------------------------------- | ----------------------- | -------------- |
| `getByRole('heading', { level: 1, name: /flag operations/i })` | heading | render dashboard hero title                        | visible                 | absent         |
| Hero "active" KPI tile                                         | text    | shows active flag count from /api/flags state="on" | numeric matches API     | mismatch       |
| `getByRole('link', { name: /all flags/i })`                    | link    | navigate to /flags                                 | URL becomes /flags      | stays          |
| Recent flag change row in "Recent flag changes" panel          | link    | deep-link to /flags/:key                           | URL becomes /flags/:key | stays          |
| `getByRole('link', { name: /view full audit log/i })`          | link    | navigate to /audit                                 | URL becomes /audit      | stays          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger                | method | path           | what request body or query is expected |
| ---------------------- | ------ | -------------- | -------------------------------------- |
| page load (first time) | POST   | /api/seed      | (idempotent demo seed)                 |
| page load              | GET    | /api/flags     | (none)                                 |
| page load              | GET    | /api/audit-log | ?limit=… for recent activity           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/10-dashboard.spec.ts`
