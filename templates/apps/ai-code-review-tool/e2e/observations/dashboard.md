# Page observations: /dashboard

> Filled from a Playwright MCP walk of the live app at `http://localhost:3070/dashboard`.
> Auth-required; the AuthGuard redirects anonymous visitors to `/login`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                           | role     | expected behavior on interaction                        | success signal                  | failure signal                 |
| ---------------------------------------------------- | -------- | ------------------------------------------------------- | ------------------------------- | ------------------------------ |
| `getByRole('heading', { name: /^Dashboard$/ })`      | heading  | renders page heading                                    | h1 visible                      | missing                        |
| `getByText(/no pull requests yet/i)`                 | text     | empty-state copy when no PRs exist                      | text visible after fresh signup | populated rows / no empty copy |
| `getByRole('link', { name: /Connect repository/i })` | link     | navigates to `/repos`                                   | URL becomes `/repos`            | stays on `/dashboard`          |
| `getByRole('link', { name: /Review history/i })`     | link     | navigates to `/history`                                 | URL becomes `/history`          | stays on `/dashboard`          |
| `[data-mol-id="ai-insight-body"]`                    | text     | rendered AI insight body once a review exists           | non-empty after seedReviewedPR  | empty placeholder              |
| `getByText(/critical/i)`                             | label    | severity badge row labeled critical                     | label visible                   | missing                        |
| seeded PR row                                        | listitem | PR title from `seedReviewedPR` shows in the recent list | PR title visible                | row absent                     |
| anonymous `/dashboard`                               | n/a      | redirect to login                                       | URL becomes `/login` (or `/`)   | dashboard renders to anonymous |

## Hidden surfaces opened from this page

| trigger | what it opens                                                                                         | elements inside (selector / role / behavior) |
| ------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| (none)  | dashboard has no menus/modals on the page itself; sidebar is in `RefractLayout` and walked separately | n/a                                          |

## Network calls expected during normal use

| trigger      | method | path                           | what request body or query is expected        |
| ------------ | ------ | ------------------------------ | --------------------------------------------- |
| initial load | GET    | `/api/pull-requests`           | owner-scoped PR list                          |
| initial load | GET    | `/api/repositories`            | owner-scoped repository list                  |
| initial load | GET    | `/api/reports/summary`         | aggregate KPI summary                         |
| initial load | GET    | `/api/reports/severity-counts` | severity tallies for the badge row            |
| initial load | GET    | `/api/reviews?limit=10`        | recent reviews used to fetch insight comments |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed (none on dashboard)
- [x] Every form has every field documented (no forms)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
