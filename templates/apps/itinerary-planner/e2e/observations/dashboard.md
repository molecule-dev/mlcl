# Page observations: /dashboard

> Filled by AI agent driving the live itinerary-planner smoke-app via
> Playwright after signup.

## Page state assumed

- [x] Auth required

## Elements

| selector / accessible name                      | role                       | expected behavior on interaction          | success signal             | failure signal                      |
| ----------------------------------------------- | -------------------------- | ----------------------------------------- | -------------------------- | ----------------------------------- |
| `getByRole('heading', { name: /next adventure   | atlas                      | adventure/i })`                           | heading                    | hero H1 reflects current trip count | visible   | empty page |
| `getByRole('link', { name: /start a new trip    | plan your first trip/i })` | link                                      | navigates to /trips/new    | URL is /trips/new                   | dead link |
| `getByRole('navigation', { name: /primary/i })` | navigation                 | sidebar contains 8 primary route links    | visible                    | sidebar missing                     |
| `getByRole('link', { name: /Trips/i })`         | link                       | navigates to /trips                       | URL is /trips              | dead link                           |
| `getByRole('link', { name: /Calendar/i })`      | link                       | navigates to /calendar                    | URL is /calendar           | dead link                           |
| `getByRole('link', { name: /Destinations/i })`  | link                       | navigates to /destinations                | URL is /destinations       | dead link                           |
| `getByRole('link', { name: /Bookings/i })`      | link                       | navigates to /bookings                    | URL is /bookings           | dead link                           |
| `getByRole('link', { name: /Expenses/i })`      | link                       | navigates to /expenses                    | URL is /expenses           | dead link                           |
| `getByRole('link', { name: /Notifications/i })` | link                       | navigates to /notifications               | URL is /notifications      | dead link                           |
| `getByRole('link', { name: /Settings/i })`      | link                       | navigates to /settings                    | URL is /settings           | dead link                           |
| `[data-testid="dashboard-empty"]`               | generic                    | empty-state card shown when 0 trips       | visible for new user       | hidden when no trips                |
| `[data-testid="dashboard-budget"]`              | generic                    | summary tiles visible after first trip    | visible after trip created | always hidden                       |
| `[data-testid="dashboard-trips"]`               | generic                    | live-trip grid populated after first trip | visible after trip created | always hidden                       |

## Hidden surfaces opened from this page

| trigger               | what it opens | elements inside (selector / role / behavior) |
| --------------------- | ------------- | -------------------------------------------- |
| Open user menu button | user dropdown | sign-out / profile links                     |

## Network calls expected during normal use

| trigger | method | path       | what request body or query is expected |
| ------- | ------ | ---------- | -------------------------------------- |
| Mount   | GET    | /api/trips | (auth header only)                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
