# Page observations: / (Dashboard (root))

> Filled from a live Playwright walk against the smoke-app on
> `VITE_PORT=3240 / API_PORT=4240`. Verified against the rendered DOM
> (`scripts/_walk-helpdesk-ticketing.mjs` snapshot dump).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                         | role    | expected behavior on interaction             | success signal              | failure signal        |
| -------------------------------------------------- | ------- | -------------------------------------------- | --------------------------- | --------------------- |
| `getByRole("heading", { level: 1 }).first()`       | heading | the dashboard hero heading paints after auth | element visible             | absent / loader stuck |
| `getByRole("link", { name: /tickets/i })`          | link    | sidebar nav link → /tickets                  | URL becomes /tickets        | stays on /            |
| `getByRole("link", { name: /knowledge\s*base/i })` | link    | sidebar nav link → /knowledge-base           | URL becomes /knowledge-base | stays on /            |
| `getByRole("link", { name: /reports/i })`          | link    | sidebar nav link → /reports                  | URL becomes /reports        | stays on /            |

## Hidden surfaces opened from this page

| trigger                                                 | what it opens | elements inside (selector / role / behavior) |
| ------------------------------------------------------- | ------------- | -------------------------------------------- |
| (none — primary affordances are visible above the fold) | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path          | what request body or query is expected |
| ------- | ------ | ------------- | -------------------------------------- |
| mount   | GET    | /api/tickets  | (none)                                 |
| mount   | GET    | /api/users/me | (none — populates the agent-card)      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
