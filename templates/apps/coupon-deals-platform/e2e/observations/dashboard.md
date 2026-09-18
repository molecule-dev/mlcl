# Page observations: /dashboard (Dashboard)

> Captured authenticated. Demo data is auto-seeded for fresh users
> via reports/dashboard_stats so the dashboard always has redemptions to chart.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                          | role       | expected behavior on interaction                                                                          | success signal               | failure signal        |
| ------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------- | ---------------------------- | --------------------- |
| `getByRole('navigation', { name: /primary navigation/i })`          | navigation | renders the SnagrLayout side nav with Dashboard/Deals/Near me/Merchants/My coupons/Notifications/Settings | visible                      | missing               |
| `getByRole('button', { name: /open user menu/i })`                  | button     | opens the user dropdown                                                                                   | dropdown visible             | nothing happens       |
| `getByText(/lifetime savings/i).first()`                            | text       | renders the hero savings figure                                                                           | visible                      | empty                 |
| `getByText(/redeemed/i).first()`                                    | text       | renders the redeemed-coupons KPI                                                                          | visible                      | missing               |
| `getByText(/saved coupons/i).first()`                               | text       | renders the saved-coupons KPI                                                                             | visible                      | missing               |
| `getByText(/expiring/i).first()`                                    | text       | renders the expiring-soon KPI                                                                             | visible                      | missing               |
| `getByRole('heading', { name: /hot deals near you/i, level: 2 })`   | heading    | renders the hot-deals row                                                                                 | visible                      | missing               |
| `page.locator('article').first()`                                   | article    | renders one of the hot-deal cards (linked to /deals/:id)                                                  | ≥1 article                   | empty                 |
| `getByRole('link', { name: 'View all' })`                           | link       | nav to /deals                                                                                             | URL becomes `/deals`         | stays on `/dashboard` |
| `getByRole('heading', { name: /top-saving merchants/i, level: 2 })` | heading    | renders the top-merchants list                                                                            | visible                      | missing               |
| `getByRole('heading', { name: /recent activity/i, level: 2 })`      | heading    | renders the recent-activity feed                                                                          | visible                      | missing               |
| `getByRole('link', { name: 'See all' })`                            | link       | nav to /notifications                                                                                     | URL becomes `/notifications` | stays on `/dashboard` |

## Hidden surfaces opened from this page

| trigger               | what it opens | elements inside                    |
| --------------------- | ------------- | ---------------------------------- |
| Open user menu button | user dropdown | "Settings" link, "Sign out" button |

## Network calls expected during normal use

| trigger   | method | path                         | expected body                                                                                |
| --------- | ------ | ---------------------------- | -------------------------------------------------------------------------------------------- |
| Page load | GET    | /api/reports/dashboard_stats | `{ total_savings, redeemed, saved, expiring, top_merchants, recent_activity, recent_deals }` |
| Page load | GET    | /api/deals                   | array of active deals (decorated)                                                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
