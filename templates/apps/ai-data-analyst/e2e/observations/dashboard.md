# Page observations: /dashboard (Dashboard)

> Authenticated. The first authenticated dashboard call triggers
> demo-seeding (4 datasets, 6 insights, 3 reports, 5 notifications).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                             | role    | expected behavior on interaction                   | success signal                | failure signal                  |
| ------------------------------------------------------ | ------- | -------------------------------------------------- | ----------------------------- | ------------------------------- |
| `page.locator('h1[data-mol-id="dashboard-greeting"]')` | heading | renders personalized greeting from useAuth()       | text contains user identifier | empty                           |
| `getByRole('link', { name: /ask clarion/i })`          | link    | nav to /query                                      | URL becomes `/query`          | stays on `/dashboard`           |
| `getByRole('link', { name: /upload data/i })`          | link    | nav to /upload                                     | URL becomes `/upload`         | stays on `/dashboard`           |
| `page.locator('main section, main article').first()`   | region  | renders the KPIs/insights cards from /api/insights | ≥1 visible                    | none, "No insights" empty state |

## Hidden surfaces opened from this page

| trigger                      | what it opens | elements inside                    |
| ---------------------------- | ------------- | ---------------------------------- |
| User menu button (TopNavBar) | user dropdown | "Settings" link, "Sign out" button |

## Network calls expected during normal use

| trigger   | method | path                         | expected body                       |
| --------- | ------ | ---------------------------- | ----------------------------------- |
| Page load | GET    | /api/reports/dashboard_stats | KPI bundle (kpis + recent_activity) |
| Page load | GET    | /api/insights                | array of seeded insight cards       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/10-dashboard.spec.ts`
