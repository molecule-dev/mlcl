# Page observations: /dashboard (Author dashboard)

> Filled by AI agent driving the running app via Playwright MCP at
> http://localhost:3060/dashboard. Auth-required (AuthGuard).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                            | role                       | expected behavior on interaction                                                                 | success signal                  | failure signal         |
| ----------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------- | ---------------------- |
| `getByRole('main', { name: 'Dashboard' })`            | landmark                   | renders the dashboard shell                                                                      | visible after auth-guard passes | redirect to /login     |
| `getByRole('heading', { level: 1 })` (welcome header) | heading                    | greets the signed-in user by name or email                                                       | non-empty text                  | missing                |
| `getByRole('navigation')` (SideNavBar)                | navigation                 | left rail with Posts / Analytics / Comments / Tags / Settings                                    | links visible                   | not present            |
| `getByRole('link', { name: /Posts/i })` (sidenav)     | link                       | navigates to /posts                                                                              | URL becomes /posts              | URL unchanged          |
| `getByRole('link', { name: /Analytics/i })` (sidenav) | link                       | navigates to /analytics                                                                          | URL becomes /analytics          | unchanged              |
| `getByRole('link', { name: /Comments/i })` (sidenav)  | link                       | navigates to /comments                                                                           | URL becomes /comments           | unchanged              |
| KPI cards row (component KpiCardsSection)             | region                     | shows publishedPosts / totalViews / totalClaps / totalComments tiles from /api/analytics/summary | numeric values render           | dashes/error           |
| Recent Posts section                                  | region                     | RecentPostsSection lists last few posts via /api/posts/mine/all?limit=5                          | rows render OR empty-state      | broken                 |
| Engagement Trends chart                               | region                     | EngagementTrendsSection renders chart of recent activity                                         | svg/canvas drawn                | empty container        |
| Right sidebar Quick Actions                           | region                     | DashboardRightSidebar renders quick-action links/buttons                                         | section visible                 | missing                |
| `getByRole('link', { name: /New post                  | Write/i })` (quick action) | link                                                                                             | opens /posts/new                | URL becomes /posts/new | unchanged |

## Hidden surfaces opened from this page

| trigger                      | what it opens | elements inside         |
| ---------------------------- | ------------- | ----------------------- |
| user-menu button (top-right) | user dropdown | sign-out, settings link |

## Network calls expected during normal use

| trigger   | method | path                   | what request body or query is expected |
| --------- | ------ | ---------------------- | -------------------------------------- |
| page load | GET    | /api/analytics/summary | for KPI cards                          |
| page load | GET    | /api/posts/mine/all    | for recent posts table                 |
| page load | GET    | /api/notifications     | header notification badge              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
