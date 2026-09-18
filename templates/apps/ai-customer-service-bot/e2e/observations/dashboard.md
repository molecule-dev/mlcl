# Page observations: /dashboard (Dashboard)

Captured from `browser_snapshot` on `http://localhost:3170/dashboard`
after `signup(page)`. The dashboard is the operator's home — KPIs,
recent activity, sidebar navigation.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                            | role                  | expected behavior on interaction  | success signal              | failure signal             |
| ----------------------------------------------------- | --------------------- | --------------------------------- | --------------------------- | -------------------------- |
| `getByRole('link', { name: /dashboard/i })` (sidebar) | link                  | navigates to /dashboard           | URL stays /dashboard        | wrong route                |
| `getByRole('link', { name: /conversations             | inbox/i })` (sidebar) | link                              | navigates to /conversations | URL becomes /conversations | unchanged |
| `getByRole('link', { name: /knowledge/i })` (sidebar) | link                  | navigates to /knowledge           | URL becomes /knowledge      | unchanged                  |
| `getByRole('link', { name: /analytics/i })` (sidebar) | link                  | navigates to /analytics           | URL becomes /analytics      | unchanged                  |
| `getByRole('link', { name: /settings/i })` (sidebar)  | link                  | navigates to /settings            | URL becomes /settings       | unchanged                  |
| `getByText(/conversations/i)` (KPI card)              | text                  | renders count from /api/analytics | numeric value visible       | "Loading…" indefinitely    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path           | what request body or query is expected            |
| --------- | ------ | -------------- | ------------------------------------------------- |
| Page load | GET    | /api/analytics | aggregate of conversations / feedback / kb counts |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
